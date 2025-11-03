package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * User Session Model
 *
 * Represents a user session stored in Redis.
 * Contains OAuth2 tokens and user information.
 * Never exposed to frontend - only session ID in HTTP-only cookie.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSession implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Unique session identifier
     */
    private String sessionId;

    /**
     * User information
     */
    private UserInfo userInfo;

    /**
     * Access token from IDP
     */
    private String accessToken;

    /**
     * ID token from IDP
     */
    private String idToken;

    /**
     * Refresh token from IDP
     */
    private String refreshToken;

    /**
     * Token type (usually "Bearer")
     */
    private String tokenType;

    /**
     * Access token expiration time (epoch milliseconds)
     */
    private Long accessTokenExpiresAt;

    /**
     * Refresh token expiration time (epoch milliseconds)
     */
    private Long refreshTokenExpiresAt;

    /**
     * Session creation time
     */
    private Instant createdAt;

    /**
     * Last activity time (updated on each request)
     */
    private Instant lastAccessedAt;

    /**
     * Session expiration time
     */
    private Instant expiresAt;

    /**
     * Check if access token is expired or about to expire
     *
     * @param thresholdSeconds Number of seconds before expiration to consider expired
     * @return true if token should be refreshed
     */
    public boolean shouldRefreshToken(int thresholdSeconds) {
        if (accessTokenExpiresAt == null) {
            return false;
        }

        long now = System.currentTimeMillis();
        long threshold = thresholdSeconds * 1000L;
        return (accessTokenExpiresAt - now) <= threshold;
    }

    /**
     * Check if session is expired
     */
    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    /**
     * Update last accessed time
     */
    public void updateLastAccessed() {
        this.lastAccessedAt = Instant.now();
    }
}
