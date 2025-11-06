package com.example.demo.controller;

import com.example.demo.model.*;
import com.example.demo.service.AccessDecisionService;
import com.example.demo.service.OAuth2Service;
import com.example.demo.service.SessionService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

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
    private final AccessDecisionService accessDecisionService;
    private final SessionService sessionService;
    private final int sessionRefreshThreshold;
    private final String redirectUri;

    public AuthController(
            OAuth2Service oauth2Service,
            AccessDecisionService accessDecisionService,
            SessionService sessionService,
            @Value("${session.refresh.threshold.seconds:300}") int sessionRefreshThreshold,
            @Value("${spring.security.oauth2.client.registration.idp.redirect-uri:http://localhost:4202/auth/callback}") String redirectUri
    ) {
        this.oauth2Service = oauth2Service;
        this.accessDecisionService = accessDecisionService;
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
    public Mono<ResponseEntity<TokenExchangeResponse>> exchangeToken(
            @Valid @RequestBody TokenExchangeRequest request,
            ServerHttpResponse response
    ) {
        log.info("Token exchange request received");

        String effectiveRedirectUri = request.getRedirectUri() != null
                ? request.getRedirectUri()
                : redirectUri;

        // 1. Exchange authorization code for tokens
        return oauth2Service.exchangeAuthorizationCode(
                        request.getCode(),
                        request.getCodeVerifier(),
                        effectiveRedirectUri
                )
                // 2. Get user info from IDP
                .flatMap(tokenResponse -> oauth2Service.getUserInfo(tokenResponse.access_token)
                        .map(userInfo -> Map.entry(tokenResponse, userInfo)))
                // 3. Determine access for web-cl using US + PSN flow
                .flatMap(entry -> {
                    OAuth2Service.TokenResponse tokenResponse = entry.getKey();
                    UserInfo userInfo = entry.getValue();

                    // Extract HSID from userInfo custom claims
                    String hsid = extractHSID(userInfo);

                    if (hsid != null && !hsid.isEmpty()) {
                        return accessDecisionService.determineAccess(hsid, AccessDecision.ApplicationType.WEB_CL)
                                .doOnNext(accessDecision -> log.info("Access decision: {} - {}",
                                        accessDecision.getAccessMode(),
                                        accessDecision.getDecisionReason()))
                                .onErrorResume(e -> {
                                    log.error("Failed to determine access (continuing with login): {}", e.getMessage());
                                    return Mono.just((AccessDecision) null);
                                })
                                .map(accessDecision -> Map.of("tokenResponse", tokenResponse, "userInfo", userInfo, "accessDecision", accessDecision));
                    } else {
                        log.warn("No HSID found in userInfo, skipping access decision");
                        return Mono.just(Map.of("tokenResponse", tokenResponse, "userInfo", userInfo, "accessDecision", (AccessDecision) null));
                    }
                })
                // 4. Create session in Redis
                .flatMap(data -> {
                    OAuth2Service.TokenResponse tokenResponse = (OAuth2Service.TokenResponse) data.get("tokenResponse");
                    UserInfo userInfo = (UserInfo) data.get("userInfo");
                    AccessDecision accessDecision = (AccessDecision) data.get("accessDecision");

                    long accessTokenExpiresAt = System.currentTimeMillis() + (tokenResponse.expires_in * 1000);

                    UserSession session = UserSession.builder()
                            .userInfo(userInfo)
                            .accessToken(tokenResponse.access_token)
                            .idToken(tokenResponse.id_token)
                            .refreshToken(tokenResponse.refresh_token)
                            .tokenType(tokenResponse.token_type)
                            .accessTokenExpiresAt(accessTokenExpiresAt)
                            .accessDecision(accessDecision)
                            .build();

                    return sessionService.createSession(session)
                            .map(sessionId -> {
                                // 5. Set HTTP-only cookie
                                setSessionCookie(response, sessionId);

                                // 6. Return user info and session expiration
                                TokenExchangeResponse exchangeResponse = TokenExchangeResponse.builder()
                                        .user(userInfo)
                                        .expiresAt(session.getExpiresAt().toEpochMilli())
                                        .sessionId(sessionId)
                                        .build();

                                log.info("Token exchange successful for user: {}", userInfo.getId());
                                return ResponseEntity.ok(exchangeResponse);
                            });
                })
                .onErrorResume(e -> {
                    log.error("Token exchange failed", e);
                    return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null));
                });
    }

    /**
     * GET /api/auth/user
     * Get current authenticated user
     */
    @GetMapping("/user")
    public Mono<ResponseEntity<UserInfo>> getCurrentUser(ServerHttpRequest request) {
        return getSessionFromRequest(request)
                .flatMap(session -> {
                    // Check if token needs refresh
                    if (session.shouldRefreshToken(sessionRefreshThreshold)) {
                        return refreshSessionTokens(session)
                                .onErrorResume(e -> {
                                    log.error("Failed to refresh tokens", e);
                                    // Continue with existing token
                                    return Mono.empty();
                                })
                                .thenReturn(session);
                    }
                    return Mono.just(session);
                })
                .map(session -> ResponseEntity.ok(session.getUserInfo()))
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    /**
     * POST /api/auth/refresh
     * Refresh session and tokens
     */
    @PostMapping("/refresh")
    public Mono<ResponseEntity<Map<String, Object>>> refreshSession(ServerHttpRequest request) {
        return getSessionFromRequest(request)
                .flatMap(session -> oauth2Service.refreshAccessToken(session.getRefreshToken())
                        .flatMap(tokenResponse -> {
                            long expiresIn = tokenResponse.expires_in != null ? tokenResponse.expires_in : 3600;

                            return sessionService.updateTokens(
                                            session.getSessionId(),
                                            tokenResponse.access_token,
                                            tokenResponse.id_token,
                                            tokenResponse.refresh_token,
                                            expiresIn
                                    )
                                    .then(sessionService.extendSession(session.getSessionId()))
                                    .then(sessionService.getSession(session.getSessionId()))
                                    .map(updatedSession -> {
                                        Map<String, Object> response = new HashMap<>();
                                        response.put("expiresAt", updatedSession.getExpiresAt().toEpochMilli());
                                        response.put("success", true);

                                        log.info("Session refreshed successfully: {}", session.getSessionId());
                                        return ResponseEntity.ok(response);
                                    });
                        }))
                .onErrorResume(e -> {
                    log.error("Session refresh failed", e);
                    return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    /**
     * POST /api/auth/logout
     * Logout user and cleanup session
     */
    @PostMapping("/logout")
    public Mono<ResponseEntity<Map<String, String>>> logout(
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        return getSessionFromRequest(request)
                .flatMap(session -> {
                    // Revoke tokens at IDP (best effort)
                    Mono<Void> revokeAccessToken = session.getAccessToken() != null
                            ? oauth2Service.revokeToken(session.getAccessToken(), "access_token")
                            .onErrorResume(e -> {
                                log.warn("Access token revocation failed (continuing with logout): {}", e.getMessage());
                                return Mono.empty();
                            })
                            : Mono.empty();

                    Mono<Void> revokeRefreshToken = session.getRefreshToken() != null
                            ? oauth2Service.revokeToken(session.getRefreshToken(), "refresh_token")
                            .onErrorResume(e -> {
                                log.warn("Refresh token revocation failed (continuing with logout): {}", e.getMessage());
                                return Mono.empty();
                            })
                            : Mono.empty();

                    return Mono.when(revokeAccessToken, revokeRefreshToken)
                            .then(sessionService.deleteSession(session.getSessionId()))
                            .doOnSuccess(v -> log.info("User logged out: {}", session.getUserInfo().getId()));
                })
                .then(Mono.fromRunnable(() -> clearSessionCookie(response)))
                .thenReturn(ResponseEntity.ok(Map.of("message", "Logged out successfully")))
                .defaultIfEmpty(ResponseEntity.ok(Map.of("message", "Logged out successfully")));
    }

    /**
     * GET /api/auth/access-decision
     * Get access decision with optional application type
     * Query param: app (web-cl or web-hs), defaults to web-cl
     * Returns complete access determination including viewable members
     */
    @GetMapping("/access-decision")
    public Mono<ResponseEntity<AccessDecision>> getAccessDecision(
            ServerHttpRequest request,
            @RequestParam(value = "app", defaultValue = "web-cl") String appType
    ) {
        // Parse application type
        AccessDecision.ApplicationType applicationType = "web-hs".equalsIgnoreCase(appType)
                ? AccessDecision.ApplicationType.WEB_HS
                : AccessDecision.ApplicationType.WEB_CL;

        return getSessionFromRequest(request)
                .flatMap(session -> {
                    AccessDecision accessDecision = session.getAccessDecision();

                    // Check if cached decision matches requested app type
                    if (accessDecision != null && accessDecision.getApplicationType() != applicationType) {
                        log.info("Cached decision is for different app type, recalculating");
                        accessDecision = null; // Force recalculation
                    }

                    if (accessDecision == null) {
                        // Try to determine access if not already cached
                        String hsid = extractHSID(session.getUserInfo());

                        if (hsid == null || hsid.isEmpty()) {
                            log.error("No HSID found in session userInfo");
                            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).<AccessDecision>body(null));
                        }

                        return accessDecisionService.determineAccess(hsid, applicationType)
                                .flatMap(decision -> sessionService.updateAccessDecision(session.getSessionId(), decision)
                                        .thenReturn(decision))
                                .doOnSuccess(decision -> log.info("Access decision determined and cached for session: {} (app: {})",
                                        session.getSessionId(), applicationType))
                                .map(ResponseEntity::ok)
                                .onErrorResume(e -> {
                                    log.error("Failed to determine access", e);
                                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<AccessDecision>body(null));
                                });
                    }

                    return Mono.just(ResponseEntity.ok(accessDecision));
                })
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED).<AccessDecision>body(null));
    }

    /**
     * GET /api/auth/session
     * Get session information
     */
    @GetMapping("/session")
    public Mono<ResponseEntity<SessionInfoResponse>> getSessionInfo(ServerHttpRequest request) {
        return getSessionFromRequest(request)
                .map(session -> {
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
                })
                .defaultIfEmpty(ResponseEntity.ok(SessionInfoResponse.builder()
                        .isValid(false)
                        .build()));
    }

    // ========== Helper Methods ==========

    /**
     * Get session from HTTP request cookie
     */
    private Mono<UserSession> getSessionFromRequest(ServerHttpRequest request) {
        return sessionService.getSessionFromRequest(request);
    }

    /**
     * Set session cookie in response
     */
    private void setSessionCookie(ServerHttpResponse response, String sessionId) {
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE_NAME, sessionId)
                .httpOnly(true)
                .secure(true) // HTTPS only in production
                .path("/")
                .maxAge(Duration.ofSeconds(COOKIE_MAX_AGE))
                .sameSite("Lax") // CSRF protection
                .build();
        response.addCookie(cookie);
    }

    /**
     * Clear session cookie
     */
    private void clearSessionCookie(ServerHttpResponse response) {
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(Duration.ZERO) // Delete cookie
                .build();
        response.addCookie(cookie);
    }

    /**
     * Refresh session tokens
     */
    private Mono<Void> refreshSessionTokens(UserSession session) {
        return oauth2Service.refreshAccessToken(session.getRefreshToken())
                .flatMap(tokenResponse -> {
                    long expiresIn = tokenResponse.expires_in != null ? tokenResponse.expires_in : 3600;
                    return sessionService.updateTokens(
                                    session.getSessionId(),
                                    tokenResponse.access_token,
                                    tokenResponse.id_token,
                                    tokenResponse.refresh_token,
                                    expiresIn
                            )
                            .doOnSuccess(v -> log.info("Tokens refreshed for session: {}", session.getSessionId()));
                });
    }

    /**
     * Extract HSID from UserInfo
     * Required for US and PSN calls
     */
    private String extractHSID(UserInfo userInfo) {
        if (userInfo.getCustomClaims() != null) {
            // Check for hsid claim
            Object hsid = userInfo.getCustomClaims().get("hsid");
            if (hsid != null && !hsid.toString().isEmpty()) {
                return hsid.toString();
            }

            // Check for member_id if it's actually HSID
            Object memberId = userInfo.getCustomClaims().get("member_id");
            if (memberId != null && !memberId.toString().isEmpty()) {
                return memberId.toString();
            }
        }

        // Fallback to user ID (sub claim) if no HSID found
        log.warn("No HSID found in userInfo custom claims, using sub claim as fallback");
        return userInfo.getId();
    }
}
