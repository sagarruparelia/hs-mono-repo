package com.example.demo.config;

import com.example.demo.filter.SessionValidationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Spring Security Configuration for WebFlux
 *
 * Configures security for the BFF with:
 * - CORS for cross-origin requests from frontend
 * - CSRF protection disabled (using session-based auth with SameSite cookies)
 * - Public and protected endpoints
 * - Session validation filter
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    private final SessionValidationFilter sessionValidationFilter;

    public SecurityConfig(SessionValidationFilter sessionValidationFilter) {
        this.sessionValidationFilter = sessionValidationFilter;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                // CORS Configuration
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF Protection - Disabled for now
                // In WebFlux with custom session management, rely on SameSite cookies
                .csrf(ServerHttpSecurity.CsrfSpec::disable)

                // Authorization Rules
                .authorizeExchange(exchanges -> exchanges
                        // Public endpoints
                        .pathMatchers(
                                "/api/auth/token",           // Token exchange (PKCE protected)
                                "/api/health",               // Health check
                                "/actuator/health",          // Actuator health
                                "/actuator/prometheus",      // Prometheus metrics
                                "/api/documents/av-callback" // AV callback from Lambda
                        ).permitAll()

                        // All other endpoints require authentication
                        .anyExchange().authenticated()
                )

                // Add session validation filter
                .addFilterBefore(sessionValidationFilter, SecurityWebFiltersOrder.AUTHENTICATION)

                .build();
    }

    /**
     * CORS Configuration
     * Allows frontend applications to make cross-origin requests
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed origins (configure per environment)
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:4202", // web-cl dev
                "http://localhost:4201", // web-hs dev
                "http://localhost:4203", // profile MFE dev
                "http://localhost:4204"  // summary MFE dev
                // Add staging/production URLs via environment variables
        ));

        // Allowed HTTP methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Allowed headers
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // Allow credentials (cookies)
        configuration.setAllowCredentials(true);

        // Expose headers to frontend
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",
                "X-CSRF-TOKEN",
                "X-Session-Expires-At"
        ));

        // Cache preflight response for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
