package com.example.demo.service;

import com.example.demo.model.UserInfo;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
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
import reactor.core.publisher.Mono;

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
     * Circuit breaker protects against IDP failures
     *
     * @param code Authorization code from IDP
     * @param codeVerifier PKCE code verifier
     * @param redirectUri Redirect URI used in authorization request
     * @return Mono of Token response containing access_token, id_token, refresh_token
     */
    @CircuitBreaker(name = "oauth2Service", fallbackMethod = "exchangeAuthorizationCodeFallback")
    @Retry(name = "oauth2Service")
    public Mono<TokenResponse> exchangeAuthorizationCode(String code, String codeVerifier, String redirectUri) {
        log.info("Exchanging authorization code for tokens");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("code", code);
        formData.add("redirect_uri", redirectUri);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("code_verifier", codeVerifier);

        return webClient.post()
                .uri(tokenUri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(TokenResponse.class)
                .doOnSuccess(response -> log.info("Successfully exchanged authorization code for tokens"))
                .doOnError(e -> log.error("Failed to exchange authorization code", e))
                .onErrorMap(e -> new RuntimeException("Token exchange failed: " + e.getMessage(), e));
    }

    /**
     * Refresh access token using refresh token
     *
     * @param refreshToken Refresh token
     * @return Mono of new token response
     */
    public Mono<TokenResponse> refreshAccessToken(String refreshToken) {
        log.info("Refreshing access token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("refresh_token", refreshToken);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);

        return webClient.post()
                .uri(tokenUri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(TokenResponse.class)
                .doOnSuccess(response -> log.info("Successfully refreshed access token"))
                .doOnError(e -> log.error("Failed to refresh access token", e))
                .onErrorMap(e -> new RuntimeException("Token refresh failed: " + e.getMessage(), e));
    }

    /**
     * Get user information from IDP
     * Circuit breaker protects against IDP failures
     *
     * @param accessToken Access token
     * @return Mono of User information
     */
    @CircuitBreaker(name = "oauth2Service", fallbackMethod = "getUserInfoFallback")
    @Retry(name = "oauth2Service")
    public Mono<UserInfo> getUserInfo(String accessToken) {
        log.info("Fetching user info from IDP");

        return webClient.get()
                .uri(userInfoUri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(Map.class)
                .flatMap(userInfoMap -> {
                    if (userInfoMap == null) {
                        return Mono.error(new RuntimeException("UserInfo response is null"));
                    }
                    return Mono.just(mapToUserInfo(userInfoMap));
                })
                .doOnSuccess(userInfo -> log.info("Successfully fetched user info from IDP"))
                .doOnError(e -> log.error("Failed to fetch user info", e))
                .onErrorMap(e -> new RuntimeException("UserInfo fetch failed: " + e.getMessage(), e));
    }

    /**
     * Revoke token at IDP (best effort)
     *
     * @param token Token to revoke
     * @param tokenTypeHint Type of token (access_token or refresh_token)
     * @return Mono of Void
     */
    public Mono<Void> revokeToken(String token, String tokenTypeHint) {
        log.info("Revoking token at IDP");

        String revokeUri = tokenUri.replace("/token", "/revoke");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("token", token);
        formData.add("token_type_hint", tokenTypeHint);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);

        return webClient.post()
                .uri(revokeUri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(Void.class)
                .doOnSuccess(v -> log.info("Successfully revoked token"))
                .doOnError(e -> log.warn("Failed to revoke token (continuing anyway): {}", e.getMessage()))
                .onErrorResume(e -> Mono.empty()); // Revocation is best effort - don't fail logout if it fails
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
     * Fallback method for exchangeAuthorizationCode
     * OAuth2 token exchange is critical - no fallback, fail immediately
     */
    private Mono<TokenResponse> exchangeAuthorizationCodeFallback(String code, String codeVerifier, String redirectUri, Exception e) {
        log.error("Circuit breaker activated for OAuth2 token exchange. IDP unavailable.", e);
        return Mono.error(new RuntimeException("OAuth2 IDP unavailable - authentication failed", e));
    }

    /**
     * Fallback method for getUserInfo
     * User info fetch is critical - no fallback, fail immediately
     */
    private Mono<UserInfo> getUserInfoFallback(String accessToken, Exception e) {
        log.error("Circuit breaker activated for OAuth2 user info fetch. IDP unavailable.", e);
        return Mono.error(new RuntimeException("OAuth2 IDP unavailable - user info fetch failed", e));
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
