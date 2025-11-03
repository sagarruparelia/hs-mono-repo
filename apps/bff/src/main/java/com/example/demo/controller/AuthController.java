package com.example.demo.controller;

import com.example.demo.model.*;
import com.example.demo.service.OAuth2Service;
import com.example.demo.service.SessionService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication Controller
 *
 * REST endpoints for authentication flow:
 * - POST /api/auth/token - Token exchange (PKCE)
 * - GET /api/auth/user - Get current user
 * - POST /api/auth/refresh - Refresh session
 * - POST /api/auth/logout - Logout
 * - GET /api/auth/session - Get session info
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String SESSION_COOKIE_NAME = "SESSION_ID";
    private static final int COOKIE_MAX_AGE = 30 * 60; // 30 minutes

    private final OAuth2Service oauth2Service;
    private final SessionService sessionService;
    private final int sessionRefreshThreshold;
    private final String redirectUri;

    public AuthController(
            OAuth2Service oauth2Service,
            SessionService sessionService,
            @Value("${session.refresh.threshold.seconds:300}") int sessionRefreshThreshold,
            @Value("${spring.security.oauth2.client.registration.idp.redirect-uri:http://localhost:4202/auth/callback}") String redirectUri
    ) {
        this.oauth2Service = oauth2Service;
        this.sessionService = sessionService;
        this.sessionRefreshThreshold = sessionRefreshThreshold;
        this.redirectUri = redirectUri;
    }

    /**
     * POST /api/auth/token
     * Exchange authorization code for tokens and create session
     *
     * Flow:
     * 1. Frontend receives code from IDP callback
     * 2. Frontend sends code + code_verifier to this endpoint
     * 3. BFF exchanges code for tokens with IDP (PKCE validation)
     * 4. BFF fetches user info from IDP
     * 5. BFF creates session in Redis
     * 6. BFF sets HTTP-only cookie with session ID
     * 7. BFF returns user info to frontend
     */
    @PostMapping("/token")
    public ResponseEntity<TokenExchangeResponse> exchangeToken(
            @Valid @RequestBody TokenExchangeRequest request,
            HttpServletResponse response
    ) {
        log.info("Token exchange request received");

        try {
            // 1. Exchange authorization code for tokens
            String effectiveRedirectUri = request.getRedirectUri() != null
                    ? request.getRedirectUri()
                    : redirectUri;

            OAuth2Service.TokenResponse tokenResponse = oauth2Service.exchangeAuthorizationCode(
                    request.getCode(),
                    request.getCodeVerifier(),
                    effectiveRedirectUri
            );

            // 2. Get user info from IDP
            UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.access_token);

            // 3. Create session in Redis
            long accessTokenExpiresAt = System.currentTimeMillis() + (tokenResponse.expires_in * 1000);

            UserSession session = UserSession.builder()
                    .userInfo(userInfo)
                    .accessToken(tokenResponse.access_token)
                    .idToken(tokenResponse.id_token)
                    .refreshToken(tokenResponse.refresh_token)
                    .tokenType(tokenResponse.token_type)
                    .accessTokenExpiresAt(accessTokenExpiresAt)
                    .build();

            String sessionId = sessionService.createSession(session);

            // 4. Set HTTP-only cookie
            setSessionCookie(response, sessionId);

            // 5. Return user info and session expiration
            TokenExchangeResponse exchangeResponse = TokenExchangeResponse.builder()
                    .user(userInfo)
                    .expiresAt(session.getExpiresAt().toEpochMilli())
                    .sessionId(sessionId) // For debugging
                    .build();

            log.info("Token exchange successful for user: {}", userInfo.getId());
            return ResponseEntity.ok(exchangeResponse);

        } catch (Exception e) {
            log.error("Token exchange failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(null);
        }
    }

    /**
     * GET /api/auth/user
     * Get current authenticated user
     */
    @GetMapping("/user")
    public ResponseEntity<UserInfo> getCurrentUser(HttpServletRequest request) {
        Optional<UserSession> sessionOpt = getSessionFromRequest(request);

        if (sessionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserSession session = sessionOpt.get();

        // Check if token needs refresh
        if (session.shouldRefreshToken(sessionRefreshThreshold)) {
            try {
                refreshSessionTokens(session);
            } catch (Exception e) {
                log.error("Failed to refresh tokens", e);
                // Continue with existing token
            }
        }

        return ResponseEntity.ok(session.getUserInfo());
    }

    /**
     * POST /api/auth/refresh
     * Refresh session and tokens
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshSession(HttpServletRequest request) {
        Optional<UserSession> sessionOpt = getSessionFromRequest(request);

        if (sessionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserSession session = sessionOpt.get();

        try {
            // Refresh tokens with IDP
            OAuth2Service.TokenResponse tokenResponse = oauth2Service.refreshAccessToken(
                    session.getRefreshToken()
            );

            // Update session with new tokens
            long expiresIn = tokenResponse.expires_in != null ? tokenResponse.expires_in : 3600;
            sessionService.updateTokens(
                    session.getSessionId(),
                    tokenResponse.access_token,
                    tokenResponse.id_token,
                    tokenResponse.refresh_token,
                    expiresIn
            );

            // Extend session expiration
            sessionService.extendSession(session.getSessionId());

            // Get updated session
            UserSession updatedSession = sessionService.getSession(session.getSessionId())
                    .orElseThrow(() -> new RuntimeException("Session not found after refresh"));

            Map<String, Object> response = new HashMap<>();
            response.put("expiresAt", updatedSession.getExpiresAt().toEpochMilli());
            response.put("success", true);

            log.info("Session refreshed successfully: {}", session.getSessionId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Session refresh failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * POST /api/auth/logout
     * Logout user and cleanup session
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        Optional<UserSession> sessionOpt = getSessionFromRequest(request);

        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();

            try {
                // Revoke tokens at IDP (best effort)
                if (session.getAccessToken() != null) {
                    oauth2Service.revokeToken(session.getAccessToken(), "access_token");
                }
                if (session.getRefreshToken() != null) {
                    oauth2Service.revokeToken(session.getRefreshToken(), "refresh_token");
                }
            } catch (Exception e) {
                log.warn("Token revocation failed (continuing with logout): {}", e.getMessage());
            }

            // Delete session from Redis
            sessionService.deleteSession(session.getSessionId());
            log.info("User logged out: {}", session.getUserInfo().getId());
        }

        // Clear session cookie
        clearSessionCookie(response);

        // Return logout URL for IDP logout redirect (optional)
        Map<String, String> logoutResponse = new HashMap<>();
        logoutResponse.put("message", "Logged out successfully");
        // logoutResponse.put("logoutUrl", idpLogoutUrl); // Add if IDP provides logout endpoint

        return ResponseEntity.ok(logoutResponse);
    }

    /**
     * GET /api/auth/session
     * Get session information
     */
    @GetMapping("/session")
    public ResponseEntity<SessionInfoResponse> getSessionInfo(HttpServletRequest request) {
        Optional<UserSession> sessionOpt = getSessionFromRequest(request);

        if (sessionOpt.isEmpty()) {
            SessionInfoResponse response = SessionInfoResponse.builder()
                    .isValid(false)
                    .build();
            return ResponseEntity.ok(response);
        }

        UserSession session = sessionOpt.get();

        // Calculate time until token refresh needed
        long now = System.currentTimeMillis();
        long refreshInSeconds = (session.getAccessTokenExpiresAt() - now) / 1000 - sessionRefreshThreshold;
        if (refreshInSeconds < 0) {
            refreshInSeconds = 0;
        }

        SessionInfoResponse response = SessionInfoResponse.builder()
                .user(session.getUserInfo())
                .expiresAt(session.getExpiresAt().toEpochMilli())
                .isValid(true)
                .refreshInSeconds(refreshInSeconds)
                .build();

        return ResponseEntity.ok(response);
    }

    // ========== Helper Methods ==========

    /**
     * Get session from HTTP request cookie
     */
    private Optional<UserSession> getSessionFromRequest(HttpServletRequest request) {
        String sessionId = getSessionIdFromCookie(request);
        if (sessionId == null) {
            return Optional.empty();
        }
        return sessionService.getSession(sessionId);
    }

    /**
     * Extract session ID from cookie
     */
    private String getSessionIdFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (SESSION_COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    /**
     * Set session cookie in response
     */
    private void setSessionCookie(HttpServletResponse response, String sessionId) {
        Cookie cookie = new Cookie(SESSION_COOKIE_NAME, sessionId);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // HTTPS only in production
        cookie.setPath("/");
        cookie.setMaxAge(COOKIE_MAX_AGE);
        cookie.setAttribute("SameSite", "Lax"); // CSRF protection
        response.addCookie(cookie);
    }

    /**
     * Clear session cookie
     */
    private void clearSessionCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(SESSION_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Delete cookie
        response.addCookie(cookie);
    }

    /**
     * Refresh session tokens
     */
    private void refreshSessionTokens(UserSession session) {
        OAuth2Service.TokenResponse tokenResponse = oauth2Service.refreshAccessToken(
                session.getRefreshToken()
        );

        long expiresIn = tokenResponse.expires_in != null ? tokenResponse.expires_in : 3600;
        sessionService.updateTokens(
                session.getSessionId(),
                tokenResponse.access_token,
                tokenResponse.id_token,
                tokenResponse.refresh_token,
                expiresIn
        );

        log.info("Tokens refreshed for session: {}", session.getSessionId());
    }
}
