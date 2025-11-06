package com.example.demo.service;

import com.example.demo.model.AccessDecision;
import com.example.demo.model.UserSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Session Service
 *
 * Manages user sessions in Redis with:
 * - Server-side session storage
 * - Automatic expiration
 * - Session validation
 * - Session refresh
 */
@Slf4j
@Service
public class SessionService {

    private static final String SESSION_KEY_PREFIX = "session:";
    private static final String SESSION_COOKIE_NAME = "SESSION_ID";

    private final ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;
    private final int sessionTimeoutMinutes;

    public SessionService(
            ReactiveRedisTemplate<String, Object> reactiveRedisTemplate,
            @Value("${session.timeout.minutes:30}") int sessionTimeoutMinutes
    ) {
        this.reactiveRedisTemplate = reactiveRedisTemplate;
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }

    /**
     * Create new session
     *
     * @param userSession Session data
     * @return Mono of Session ID
     */
    public Mono<String> createSession(UserSession userSession) {
        String sessionId = UUID.randomUUID().toString();
        userSession.setSessionId(sessionId);
        userSession.setCreatedAt(Instant.now());
        userSession.setLastAccessedAt(Instant.now());
        userSession.setExpiresAt(Instant.now().plusSeconds(sessionTimeoutMinutes * 60L));

        String key = SESSION_KEY_PREFIX + sessionId;
        return reactiveRedisTemplate.opsForValue()
                .set(key, userSession, Duration.ofMinutes(sessionTimeoutMinutes))
                .doOnSuccess(success -> log.info("Created session for user: {} (sessionId: {})",
                        userSession.getUserInfo().getId(), sessionId))
                .thenReturn(sessionId);
    }

    /**
     * Get session from HTTP request
     * Extracts session ID from cookie
     *
     * @param request Reactive HTTP request
     * @return Mono of Session data if exists and valid
     */
    public Mono<UserSession> getSessionFromRequest(ServerHttpRequest request) {
        // Extract session ID from cookie
        String sessionId = getSessionIdFromCookie(request);
        if (sessionId == null) {
            return Mono.empty();
        }
        return getSession(sessionId);
    }

    /**
     * Extract session ID from cookie
     *
     * @param request Reactive HTTP request
     * @return Session ID or null
     */
    private String getSessionIdFromCookie(ServerHttpRequest request) {
        HttpCookie cookie = request.getCookies().getFirst(SESSION_COOKIE_NAME);
        return cookie != null ? cookie.getValue() : null;
    }

    /**
     * Get session by ID
     *
     * @param sessionId Session ID
     * @return Mono of Session data if exists and valid
     */
    public Mono<UserSession> getSession(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) {
            return Mono.empty();
        }

        String key = SESSION_KEY_PREFIX + sessionId;
        return reactiveRedisTemplate.opsForValue().get(key)
                .cast(UserSession.class)
                .flatMap(session -> {
                    // Check if session is expired
                    if (session.isExpired()) {
                        log.warn("Session expired: {}", sessionId);
                        return deleteSession(sessionId).then(Mono.empty());
                    }

                    // Update last accessed time
                    session.updateLastAccessed();
                    return updateSession(sessionId, session)
                            .thenReturn(session);
                });
    }

    /**
     * Update existing session
     *
     * @param sessionId Session ID
     * @param userSession Updated session data
     * @return Mono of Void
     */
    public Mono<Void> updateSession(String sessionId, UserSession userSession) {
        String key = SESSION_KEY_PREFIX + sessionId;

        // Extend TTL on update
        return reactiveRedisTemplate.opsForValue()
                .set(key, userSession, Duration.ofMinutes(sessionTimeoutMinutes))
                .doOnSuccess(success -> log.debug("Updated session: {}", sessionId))
                .then();
    }

    /**
     * Refresh session expiration
     *
     * @param sessionId Session ID
     * @return Mono of Void
     */
    public Mono<Void> extendSession(String sessionId) {
        return getSession(sessionId)
                .flatMap(session -> {
                    session.setExpiresAt(Instant.now().plusSeconds(sessionTimeoutMinutes * 60L));
                    return updateSession(sessionId, session)
                            .doOnSuccess(v -> log.debug("Extended session: {}", sessionId));
                });
    }

    /**
     * Delete session
     *
     * @param sessionId Session ID
     * @return Mono of Void
     */
    public Mono<Void> deleteSession(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) {
            return Mono.empty();
        }

        String key = SESSION_KEY_PREFIX + sessionId;
        return reactiveRedisTemplate.delete(key)
                .doOnSuccess(count -> log.info("Deleted session: {}", sessionId))
                .then();
    }

    /**
     * Validate session exists and is not expired
     *
     * @param sessionId Session ID
     * @return Mono of true if session is valid
     */
    public Mono<Boolean> isSessionValid(String sessionId) {
        return getSession(sessionId)
                .hasElement();
    }

    /**
     * Update session tokens after refresh
     *
     * @param sessionId Session ID
     * @param accessToken New access token
     * @param idToken New ID token (optional)
     * @param refreshToken New refresh token (optional)
     * @param expiresIn Token expiration in seconds
     * @return Mono of Void
     */
    public Mono<Void> updateTokens(String sessionId, String accessToken, String idToken, String refreshToken, long expiresIn) {
        return getSession(sessionId)
                .flatMap(session -> {
                    session.setAccessToken(accessToken);

                    if (idToken != null) {
                        session.setIdToken(idToken);
                    }

                    if (refreshToken != null) {
                        session.setRefreshToken(refreshToken);
                    }

                    long expiresAt = System.currentTimeMillis() + (expiresIn * 1000);
                    session.setAccessTokenExpiresAt(expiresAt);

                    return updateSession(sessionId, session)
                            .doOnSuccess(v -> log.info("Updated tokens for session: {}", sessionId));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Cannot update tokens - session not found: {}", sessionId);
                    return Mono.empty();
                }));
    }

    /**
     * Update access decision information in session
     *
     * @param sessionId Session ID
     * @param accessDecision Access decision from AccessDecisionService
     * @return Mono of Void
     */
    public Mono<Void> updateAccessDecision(String sessionId, AccessDecision accessDecision) {
        return getSession(sessionId)
                .flatMap(session -> {
                    session.setAccessDecision(accessDecision);
                    return updateSession(sessionId, session)
                            .doOnSuccess(v -> log.info("Updated access decision for session: {}", sessionId));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Cannot update access decision - session not found: {}", sessionId);
                    return Mono.empty();
                }));
    }
}
