package com.example.demo.filter;

import com.example.demo.service.SessionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Reactive Session Validation Filter
 *
 * Validates session on every request to protected endpoints:
 * - Extracts session ID from HTTP-only cookie
 * - Validates session exists in Redis
 * - Checks session expiration
 * - Extends session TTL on activity
 *
 * Skips validation for public endpoints.
 */
@Slf4j
@Component
public class SessionValidationFilter implements WebFilter {

    private static final String SESSION_COOKIE_NAME = "SESSION_ID";

    // Public endpoints that don't require session validation
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/auth/token",
            "/api/health",
            "/actuator/health",
            "/actuator/prometheus",
            "/api/documents/av-callback"
    );

    private final SessionService sessionService;
    private final int sessionRefreshThreshold;

    public SessionValidationFilter(
            SessionService sessionService,
            @Value("${session.refresh.threshold.seconds:300}") int sessionRefreshThreshold
    ) {
        this.sessionService = sessionService;
        this.sessionRefreshThreshold = sessionRefreshThreshold;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String requestPath = exchange.getRequest().getPath().value();

        // Skip validation for public endpoints
        if (isPublicPath(requestPath)) {
            return chain.filter(exchange);
        }

        // Extract session ID from cookie
        String sessionId = getSessionIdFromCookie(exchange);

        if (sessionId == null) {
            log.debug("No session cookie found for path: {}", requestPath);
            return sendUnauthorized(exchange, "No session found");
        }

        // Validate session
        return sessionService.getSession(sessionId)
                .flatMap(session -> {
                    // Check if token needs refresh (automatic token refresh)
                    if (session.shouldRefreshToken(sessionRefreshThreshold)) {
                        log.info("Token close to expiration for session: {} (will be refreshed by client)", sessionId);
                        // Note: In reactive pattern, we don't block here for refresh
                        // The client should handle token refresh via /api/auth/refresh endpoint
                    }

                    // Session is valid - extend session TTL
                    return sessionService.extendSession(sessionId)
                            .doOnSuccess(v -> log.debug("Extended session TTL: {}", sessionId))
                            .onErrorResume(e -> {
                                log.warn("Failed to extend session TTL (continuing): {}", e.getMessage());
                                return Mono.empty();
                            })
                            .then(chain.filter(exchange));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Invalid or expired session: {}", sessionId);
                    return sendUnauthorized(exchange, "Session expired");
                }));
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
    private String getSessionIdFromCookie(ServerWebExchange exchange) {
        HttpCookie cookie = exchange.getRequest().getCookies().getFirst(SESSION_COOKIE_NAME);
        return cookie != null ? cookie.getValue() : null;
    }

    /**
     * Send 401 Unauthorized response
     */
    private Mono<Void> sendUnauthorized(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");

        String responseBody = String.format("{\"error\": \"Unauthorized\", \"message\": \"%s\"}", message);
        byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);

        return exchange.getResponse().writeWith(
                Mono.just(exchange.getResponse().bufferFactory().wrap(bytes))
        );
    }
}
