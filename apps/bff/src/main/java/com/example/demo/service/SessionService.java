package com.example.demo.service;

import com.example.demo.model.UserSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
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

    private final RedisTemplate<String, Object> redisTemplate;
    private final int sessionTimeoutMinutes;

    public SessionService(
            RedisTemplate<String, Object> redisTemplate,
            @Value("${session.timeout.minutes:30}") int sessionTimeoutMinutes
    ) {
        this.redisTemplate = redisTemplate;
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }

    /**
     * Create new session
     *
     * @param userSession Session data
     * @return Session ID
     */
    public String createSession(UserSession userSession) {
        String sessionId = UUID.randomUUID().toString();
        userSession.setSessionId(sessionId);
        userSession.setCreatedAt(Instant.now());
        userSession.setLastAccessedAt(Instant.now());
        userSession.setExpiresAt(Instant.now().plusSeconds(sessionTimeoutMinutes * 60L));

        String key = SESSION_KEY_PREFIX + sessionId;
        redisTemplate.opsForValue().set(
                key,
                userSession,
                Duration.ofMinutes(sessionTimeoutMinutes)
        );

        log.info("Created session for user: {} (sessionId: {})", userSession.getUserInfo().getId(), sessionId);
        return sessionId;
    }

    /**
     * Get session by ID
     *
     * @param sessionId Session ID
     * @return Session data if exists and valid
     */
    public Optional<UserSession> getSession(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) {
            return Optional.empty();
        }

        String key = SESSION_KEY_PREFIX + sessionId;
        Object value = redisTemplate.opsForValue().get(key);

        if (value instanceof UserSession session) {
            // Check if session is expired
            if (session.isExpired()) {
                log.warn("Session expired: {}", sessionId);
                deleteSession(sessionId);
                return Optional.empty();
            }

            // Update last accessed time
            session.updateLastAccessed();
            updateSession(sessionId, session);

            return Optional.of(session);
        }

        return Optional.empty();
    }

    /**
     * Update existing session
     *
     * @param sessionId Session ID
     * @param userSession Updated session data
     */
    public void updateSession(String sessionId, UserSession userSession) {
        String key = SESSION_KEY_PREFIX + sessionId;

        // Extend TTL on update
        redisTemplate.opsForValue().set(
                key,
                userSession,
                Duration.ofMinutes(sessionTimeoutMinutes)
        );

        log.debug("Updated session: {}", sessionId);
    }

    /**
     * Refresh session expiration
     *
     * @param sessionId Session ID
     */
    public void extendSession(String sessionId) {
        Optional<UserSession> sessionOpt = getSession(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.setExpiresAt(Instant.now().plusSeconds(sessionTimeoutMinutes * 60L));
            updateSession(sessionId, session);
            log.debug("Extended session: {}", sessionId);
        }
    }

    /**
     * Delete session
     *
     * @param sessionId Session ID
     */
    public void deleteSession(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) {
            return;
        }

        String key = SESSION_KEY_PREFIX + sessionId;
        redisTemplate.delete(key);
        log.info("Deleted session: {}", sessionId);
    }

    /**
     * Validate session exists and is not expired
     *
     * @param sessionId Session ID
     * @return true if session is valid
     */
    public boolean isSessionValid(String sessionId) {
        return getSession(sessionId).isPresent();
    }

    /**
     * Update session tokens after refresh
     *
     * @param sessionId Session ID
     * @param accessToken New access token
     * @param idToken New ID token (optional)
     * @param refreshToken New refresh token (optional)
     * @param expiresIn Token expiration in seconds
     */
    public void updateTokens(String sessionId, String accessToken, String idToken, String refreshToken, long expiresIn) {
        Optional<UserSession> sessionOpt = getSession(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.setAccessToken(accessToken);

            if (idToken != null) {
                session.setIdToken(idToken);
            }

            if (refreshToken != null) {
                session.setRefreshToken(refreshToken);
            }

            long expiresAt = System.currentTimeMillis() + (expiresIn * 1000);
            session.setAccessTokenExpiresAt(expiresAt);

            updateSession(sessionId, session);
            log.info("Updated tokens for session: {}", sessionId);
        } else {
            log.warn("Cannot update tokens - session not found: {}", sessionId);
        }
    }
}
