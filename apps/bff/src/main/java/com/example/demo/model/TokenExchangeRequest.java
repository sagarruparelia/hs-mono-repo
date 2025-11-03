package com.example.demo.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Token Exchange Request DTO
 *
 * Request body for POST /api/auth/token
 * Frontend sends authorization code and code verifier after OAuth callback
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenExchangeRequest {

    /**
     * Authorization code from IDP callback
     */
    @NotBlank(message = "Authorization code is required")
    private String code;

    /**
     * PKCE code verifier (stored in frontend sessionStorage)
     */
    @NotBlank(message = "Code verifier is required")
    private String codeVerifier;

    /**
     * Optional redirect URI (must match the one used in authorization request)
     */
    private String redirectUri;
}
