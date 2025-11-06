package com.example.demo.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Custom Health Indicator for OAuth2 Identity Provider
 * Checks IDP availability and provides detailed status information
 */
@Slf4j
@Component
public class OAuth2HealthIndicator implements HealthIndicator {

    private final WebClient webClient;
    private final String issuerUri;

    public OAuth2HealthIndicator(
            WebClient webClient,
            @Value("${spring.security.oauth2.client.provider.idp.issuer-uri}") String issuerUri
    ) {
        this.webClient = webClient;
        this.issuerUri = issuerUri;
    }

    @Override
    public Health health() {
        try {
            // Check if OIDC discovery endpoint is accessible
            String discoveryUrl = issuerUri + "/.well-known/openid-configuration";

            String response = webClient.get()
                    .uri(discoveryUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();

            if (response != null && response.contains("issuer")) {
                log.debug("OAuth2 IDP health check passed - Issuer: {}", issuerUri);

                return Health.up()
                        .withDetail("issuer", issuerUri)
                        .withDetail("discoveryUrl", discoveryUrl)
                        .withDetail("status", "Reachable")
                        .build();
            } else {
                log.warn("OAuth2 IDP health check - unexpected response from {}", discoveryUrl);
                return Health.unknown()
                        .withDetail("issuer", issuerUri)
                        .withDetail("status", "Unexpected response")
                        .build();
            }

        } catch (Exception e) {
            log.error("OAuth2 IDP health check failed - Issuer: {}", issuerUri, e);
            return Health.down()
                    .withDetail("issuer", issuerUri)
                    .withDetail("error", e.getClass().getSimpleName())
                    .withDetail("message", e.getMessage())
                    .build();
        }
    }
}
