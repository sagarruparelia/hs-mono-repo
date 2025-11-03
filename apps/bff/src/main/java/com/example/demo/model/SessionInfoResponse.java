package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Session Info Response DTO
 *
 * Response body for GET /api/auth/session
 * Provides session information to frontend without exposing tokens
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionInfoResponse {

    /**
     * User information
     */
    private UserInfo user;

    /**
     * Session expiration time (epoch milliseconds)
     */
    private Long expiresAt;

    /**
     * Whether session is valid
     */
    private Boolean isValid;

    /**
     * Time until token refresh (seconds)
     */
    private Long refreshInSeconds;
}
