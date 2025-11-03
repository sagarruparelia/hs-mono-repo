package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Token Exchange Response DTO
 *
 * Response body for POST /api/auth/token
 * Returns user info and session expiration to frontend
 * Actual tokens are stored in Redis session (not sent to frontend)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenExchangeResponse {

    /**
     * User information
     */
    private UserInfo user;

    /**
     * Session expiration time (epoch milliseconds)
     */
    private Long expiresAt;

    /**
     * Session ID (for debugging only - not used by frontend)
     * Frontend uses HTTP-only cookie
     */
    private String sessionId;
}
