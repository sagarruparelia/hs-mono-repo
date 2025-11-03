package com.example.demo.service;

import com.example.demo.model.UserInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

/**
 * OAuth2 Service
 *
 * Handles OAuth2 operations with external Identity Provider:
 * - Token exchange (authorization code -> tokens)
 * - Token refresh
 * - Token revocation
 * - UserInfo retrieval
 */
@Slf4j
@Service
public class OAuth2Service {

    private final WebClient webClient;
    private final ClientRegistration clientRegistration;
    private final String tokenUri;
    private final String userInfoUri;
    private final String clientId;
    private final String clientSecret;

    public OAuth2Service(
            WebClient webClient,
            ClientRegistrationRepository clientRegistrationRepository,
            @Value("${spring.security.oauth2.client.provider.idp.token-uri}") String tokenUri,
            @Value("${spring.security.oauth2.client.provider.idp.user-info-uri}") String userInfoUri,
            @Value("${spring.security.oauth2.client.registration.idp.client-id}") String clientId,
            @Value("${spring.security.oauth2.client.registration.idp.client-secret}") String clientSecret
    ) {
        this.webClient = webClient;
        this.clientRegistration = clientRegistrationRepository.findByRegistrationId("idp");
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Exchange authorization code for tokens
     *
     * @param code Authorization code from IDP
     * @param codeVerifier PKCE code verifier
     * @param redirectUri Redirect URI used in authorization request
     * @return Token response containing access_token, id_token, refresh_token
     */
    public TokenResponse exchangeAuthorizationCode(String code, String codeVerifier, String redirectUri) {
        log.info("Exchanging authorization code for tokens");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("code", code);
        formData.add("redirect_uri", redirectUri);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("code_verifier", codeVerifier);

        try {
            TokenResponse response = webClient.post()
                    .uri(tokenUri)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .bodyToMono(TokenResponse.class)
                    .block();

            log.info("Successfully exchanged authorization code for tokens");
            return response;
        } catch (Exception e) {
            log.error("Failed to exchange authorization code", e);
            throw new RuntimeException("Token exchange failed: " + e.getMessage(), e);
        }
    }

    /**
     * Refresh access token using refresh token
     *
     * @param refreshToken Refresh token
     * @return New token response
     */
    public TokenResponse refreshAccessToken(String refreshToken) {
        log.info("Refreshing access token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("refresh_token", refreshToken);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);

        try {
            TokenResponse response = webClient.post()
                    .uri(tokenUri)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .bodyToMono(TokenResponse.class)
                    .block();

            log.info("Successfully refreshed access token");
            return response;
        } catch (Exception e) {
            log.error("Failed to refresh access token", e);
            throw new RuntimeException("Token refresh failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get user information from IDP
     *
     * @param accessToken Access token
     * @return User information
     */
    public UserInfo getUserInfo(String accessToken) {
        log.info("Fetching user info from IDP");

        try {
            Map<String, Object> userInfoMap = webClient.get()
                    .uri(userInfoUri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (userInfoMap == null) {
                throw new RuntimeException("UserInfo response is null");
            }

            return mapToUserInfo(userInfoMap);
        } catch (Exception e) {
            log.error("Failed to fetch user info", e);
            throw new RuntimeException("UserInfo fetch failed: " + e.getMessage(), e);
        }
    }

    /**
     * Revoke token at IDP (best effort)
     *
     * @param token Token to revoke
     * @param tokenTypeHint Type of token (access_token or refresh_token)
     */
    public void revokeToken(String token, String tokenTypeHint) {
        log.info("Revoking token at IDP");

        String revokeUri = tokenUri.replace("/token", "/revoke");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("token", token);
        formData.add("token_type_hint", tokenTypeHint);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);

        try {
            webClient.post()
                    .uri(revokeUri)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            log.info("Successfully revoked token");
        } catch (Exception e) {
            // Revocation is best effort - don't fail logout if it fails
            log.warn("Failed to revoke token (continuing anyway): {}", e.getMessage());
        }
    }

    /**
     * Map IDP userinfo response to UserInfo model
     */
    private UserInfo mapToUserInfo(Map<String, Object> userInfoMap) {
        UserInfo.UserInfoBuilder builder = UserInfo.builder()
                .id((String) userInfoMap.get("sub"))
                .email((String) userInfoMap.get("email"))
                .name((String) userInfoMap.get("name"))
                .givenName((String) userInfoMap.get("given_name"))
                .familyName((String) userInfoMap.get("family_name"))
                .picture((String) userInfoMap.get("picture"))
                .locale((String) userInfoMap.get("locale"));

        // Email verified
        Object emailVerified = userInfoMap.get("email_verified");
        if (emailVerified instanceof Boolean) {
            builder.emailVerified((Boolean) emailVerified);
        }

        // Roles (can be in different claims depending on IDP)
        List<String> roles = extractRoles(userInfoMap);
        builder.roles(roles);

        // Permissions (optional)
        List<String> permissions = extractPermissions(userInfoMap);
        builder.permissions(permissions);

        // Custom claims
        Map<String, Object> customClaims = new HashMap<>(userInfoMap);
        customClaims.keySet().removeAll(Arrays.asList(
                "sub", "email", "name", "given_name", "family_name",
                "picture", "locale", "email_verified", "roles", "groups", "permissions"
        ));
        builder.customClaims(customClaims);

        return builder.build();
    }

    /**
     * Extract roles from userinfo response
     * Checks multiple possible claim names
     */
    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Map<String, Object> userInfoMap) {
        // Try common claim names
        for (String claimName : Arrays.asList("roles", "groups", "authorities")) {
            Object claim = userInfoMap.get(claimName);
            if (claim instanceof List) {
                return (List<String>) claim;
            } else if (claim instanceof String) {
                return Arrays.asList(((String) claim).split(","));
            }
        }
        return new ArrayList<>();
    }

    /**
     * Extract permissions from userinfo response
     */
    @SuppressWarnings("unchecked")
    private List<String> extractPermissions(Map<String, Object> userInfoMap) {
        Object permissions = userInfoMap.get("permissions");
        if (permissions instanceof List) {
            return (List<String>) permissions;
        } else if (permissions instanceof String) {
            return Arrays.asList(((String) permissions).split(","));
        }
        return new ArrayList<>();
    }

    /**
     * Token Response DTO
     */
    public static class TokenResponse {
        public String access_token;
        public String token_type;
        public Long expires_in;
        public String refresh_token;
        public String id_token;
        public String scope;
    }
}
