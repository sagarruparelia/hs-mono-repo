package com.example.demo.filter;

import com.example.demo.model.UserSession;
import com.example.demo.service.OAuth2Service;
import com.example.demo.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Session Validation Filter
 *
 * Validates session on every request to protected endpoints:
 * - Extracts session ID from HTTP-only cookie
 * - Validates session exists in Redis
 * - Checks session expiration
 * - Automatically refreshes tokens if needed
 * - Extends session TTL on activity
 *
 * Skips validation for public endpoints.
 */
@Slf4j
@Component
public class SessionValidationFilter extends OncePerRequestFilter {

    private static final String SESSION_COOKIE_NAME = "SESSION_ID";

    // Public endpoints that don't require session validation
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/auth/token",
            "/api/health",
            "/actuator/health"
    );

    private final SessionService sessionService;
    private final OAuth2Service oauth2Service;
    private final int sessionRefreshThreshold;

    public SessionValidationFilter(
            SessionService sessionService,
            OAuth2Service oauth2Service,
            @Value("${session.refresh.threshold.seconds:300}") int sessionRefreshThreshold
    ) {
        this.sessionService = sessionService;
        this.oauth2Service = oauth2Service;
        this.sessionRefreshThreshold = sessionRefreshThreshold;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        // Skip validation for public endpoints
        if (isPublicPath(requestPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract session ID from cookie
        String sessionId = getSessionIdFromCookie(request);

        if (sessionId == null) {
            log.debug("No session cookie found for path: {}", requestPath);
            sendUnauthorized(response, "No session found");
            return;
        }

        // Validate session
        Optional<UserSession> sessionOpt = sessionService.getSession(sessionId);

        if (sessionOpt.isEmpty()) {
            log.warn("Invalid or expired session: {}", sessionId);
            sendUnauthorized(response, "Session expired");
            return;
        }

        UserSession session = sessionOpt.get();

        // Check if token needs refresh (automatic token refresh)
        if (session.shouldRefreshToken(sessionRefreshThreshold)) {
            try {
                log.info("Auto-refreshing tokens for session: {}", sessionId);
                refreshTokens(session);
            } catch (Exception e) {
                log.error("Failed to auto-refresh tokens for session: {}", sessionId, e);
                // Don't fail the request - continue with existing token
                // Token might still be valid, just close to expiration
            }
        }

        // Session is valid - extend session TTL
        sessionService.extendSession(sessionId);

        // Set user context in request attribute for controllers
        request.setAttribute("userSession", session);
        request.setAttribute("userId", session.getUserInfo().getId());

        // Continue with request
        filterChain.doFilter(request, response);
    }

    /**
     * Check if path is public (doesn't require authentication)
     */
    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
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
     * Refresh tokens with IDP
     */
    private void refreshTokens(UserSession session) {
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
    }

    /**
     * Send 401 Unauthorized response
     */
    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(
                String.format("{\"error\": \"Unauthorized\", \"message\": \"%s\"}", message)
        );
    }
}
