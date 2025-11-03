package com.example.demo.config;

import com.example.demo.filter.SessionValidationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security Configuration
 *
 * Configures security for the BFF with:
 * - CORS for cross-origin requests from frontend
 * - CSRF protection with cookies
 * - Session management with Redis
 * - Public and protected endpoints
 * - Session validation filter
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SessionValidationFilter sessionValidationFilter;

    public SecurityConfig(SessionValidationFilter sessionValidationFilter) {
        this.sessionValidationFilter = sessionValidationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // CSRF Token Handler
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName("_csrf");

        http
                // CORS Configuration
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF Protection
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(csrfHandler)
                        // Disable CSRF for auth endpoints (PKCE provides protection)
                        .ignoringRequestMatchers("/api/auth/token", "/api/auth/logout")
                )

                // Authorization Rules
                .authorizeHttpRequests(authorize -> authorize
                        // Public endpoints
                        .requestMatchers(
                                "/api/auth/token",      // Token exchange (PKCE protected)
                                "/api/health",           // Health check
                                "/actuator/health"       // Actuator health
                        ).permitAll()

                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )

                // Session Management
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(1) // Single session per user
                        .maxSessionsPreventsLogin(false) // New login invalidates old session
                )

                // Add session validation filter
                .addFilterBefore(sessionValidationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
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
