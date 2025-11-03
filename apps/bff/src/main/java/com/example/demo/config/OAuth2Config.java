package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * OAuth2 Client Configuration
 *
 * Configures OAuth2 client for communication with external Identity Provider:
 * - Client registration with IDP
 * - Authorization endpoints
 * - Token exchange configuration
 * - WebClient for OAuth2 API calls
 */
@Configuration
public class OAuth2Config {

    @Value("${spring.security.oauth2.client.registration.idp.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.idp.client-secret}")
    private String clientSecret;

    @Value("${spring.security.oauth2.client.registration.idp.scope:openid,profile,email}")
    private String scope;

    @Value("${spring.security.oauth2.client.provider.idp.issuer-uri}")
    private String issuerUri;

    @Value("${spring.security.oauth2.client.provider.idp.authorization-uri}")
    private String authorizationUri;

    @Value("${spring.security.oauth2.client.provider.idp.token-uri}")
    private String tokenUri;

    @Value("${spring.security.oauth2.client.provider.idp.user-info-uri}")
    private String userInfoUri;

    @Value("${spring.security.oauth2.client.provider.idp.jwk-set-uri:}")
    private String jwkSetUri;

    /**
     * Client Registration Repository
     * Configures OAuth2 client for IDP communication
     */
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(this.idpClientRegistration());
    }

    /**
     * IDP Client Registration
     * Contains all OAuth2 client configuration
     */
    private ClientRegistration idpClientRegistration() {
        ClientRegistration.Builder builder = ClientRegistration.withRegistrationId("idp")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope(scope.split(","))
                .authorizationUri(authorizationUri)
                .tokenUri(tokenUri)
                .userInfoUri(userInfoUri)
                .userNameAttributeName("sub")
                .clientName("External IDP");

        // Add JWK Set URI if provided (for JWT validation)
        if (jwkSetUri != null && !jwkSetUri.isEmpty()) {
            builder.jwkSetUri(jwkSetUri);
        }

        return builder.build();
    }

    /**
     * WebClient for OAuth2 API calls
     * Used for token exchange, refresh, and revocation
     */
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .baseUrl(issuerUri)
                .build();
    }
}
