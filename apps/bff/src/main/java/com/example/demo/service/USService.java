package com.example.demo.service;

import com.example.demo.model.BiometricInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * US (User Service) Service
 *
 * Handles OAuth2 client credentials flow to retrieve biometric and demographic
 * information for members. This is the FIRST call in the access determination flow.
 *
 * Flow:
 * 1. Get OAuth2 token using client credentials
 * 2. Call US biometric API with member's HSID
 * 3. Parse response containing DOB, age, persona attributes
 * 4. Determine if member is under 18 or has PR persona
 */
@Slf4j
@Service
public class USService {

    private static final String CACHE_KEY_PREFIX = "us:biometric:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    private final WebClient webClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final String usTokenUri;
    private final String usBiometricUri;
    private final String clientId;
    private final String clientSecret;
    private final String scope;

    // Cache for client credentials token
    private volatile String cachedAccessToken;
    private volatile long tokenExpiresAt = 0;

    public USService(
            WebClient webClient,
            RedisTemplate<String, Object> redisTemplate,
            @Value("${us.oauth2.token-uri}") String usTokenUri,
            @Value("${us.oauth2.biometric-uri}") String usBiometricUri,
            @Value("${us.oauth2.client-id}") String clientId,
            @Value("${us.oauth2.client-secret}") String clientSecret,
            @Value("${us.oauth2.scope:us.biometric.read}") String scope
    ) {
        this.webClient = webClient;
        this.redisTemplate = redisTemplate;
        this.usTokenUri = usTokenUri;
        this.usBiometricUri = usBiometricUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
    }

    /**
     * Get biometric information for a member from US
     * Cached in Redis for 30 minutes
     *
     * @param hsid Member's HSID (unique identifier)
     * @return Biometric info including age, DOB, persona
     */
    public BiometricInfo getBiometricInfo(String hsid) {
        log.debug("Fetching biometric info for HSID: {}", hsid);

        // Check cache first
        String cacheKey = CACHE_KEY_PREFIX + hsid;
        Object cachedValue = redisTemplate.opsForValue().get(cacheKey);

        if (cachedValue instanceof BiometricInfo) {
            log.info("Biometric info found in cache for HSID: {}", hsid);
            return (BiometricInfo) cachedValue;
        }

        log.info("Biometric info not in cache, fetching from US for HSID: {}", hsid);

        try {
            // Get client credentials token
            String accessToken = getClientCredentialsToken();

            // Call US biometric API
            Map<String, Object> usResponse = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(usBiometricUri)
                            .queryParam("hsid", hsid)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (usResponse == null) {
                throw new RuntimeException("US biometric response is null");
            }

            // Parse US response
            BiometricInfo biometricInfo = parseUSResponse(usResponse);

            // Cache the result for 30 minutes
            redisTemplate.opsForValue().set(cacheKey, biometricInfo, CACHE_TTL);

            log.info("Successfully fetched and cached biometric info from US. Age: {}, IsMinor: {}, HasPR: {}",
                    biometricInfo.getAge(),
                    biometricInfo.getIsMinor(),
                    biometricInfo.getHasPersonaRepresentative());

            return biometricInfo;

        } catch (Exception e) {
            log.error("Failed to fetch biometric info from US", e);
            throw new RuntimeException("US biometric fetch failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get OAuth2 token using client credentials flow
     * Caches token until it expires
     */
    private String getClientCredentialsToken() {
        // Check if cached token is still valid (with 60 second buffer)
        long now = System.currentTimeMillis();
        if (cachedAccessToken != null && tokenExpiresAt > (now + 60000)) {
            log.debug("Using cached US client credentials token");
            return cachedAccessToken;
        }

        log.info("Fetching new US client credentials token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "client_credentials");
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("scope", scope);

        try {
            ClientCredentialsTokenResponse tokenResponse = webClient.post()
                    .uri(usTokenUri)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .body(BodyInserters.fromFormData(formData))
                    .retrieve()
                    .bodyToMono(ClientCredentialsTokenResponse.class)
                    .block();

            if (tokenResponse == null || tokenResponse.access_token == null) {
                throw new RuntimeException("Invalid token response from US");
            }

            // Cache token
            cachedAccessToken = tokenResponse.access_token;
            long expiresIn = tokenResponse.expires_in != null ? tokenResponse.expires_in : 3600;
            tokenExpiresAt = now + (expiresIn * 1000);

            log.info("Successfully obtained US client credentials token");
            return cachedAccessToken;

        } catch (Exception e) {
            log.error("Failed to get US client credentials token", e);
            throw new RuntimeException("US token fetch failed: " + e.getMessage(), e);
        }
    }

    /**
     * Parse US API response into BiometricInfo
     */
    private BiometricInfo parseUSResponse(Map<String, Object> usResponse) {
        BiometricInfo.BiometricInfoBuilder builder = BiometricInfo.builder();

        // Basic info
        builder.hsid((String) usResponse.get("hsid"));
        builder.firstName((String) usResponse.get("firstName"));
        builder.lastName((String) usResponse.get("lastName"));

        // Date of birth and age calculation
        String dob = (String) usResponse.get("dateOfBirth");
        builder.dateOfBirth(dob);

        if (dob != null && !dob.isEmpty()) {
            try {
                LocalDate birthDate = LocalDate.parse(dob, DateTimeFormatter.ISO_LOCAL_DATE);
                LocalDate today = LocalDate.now();
                int age = Period.between(birthDate, today).getYears();

                builder.age(age);
                builder.isMinor(age < 18);
            } catch (Exception e) {
                log.warn("Failed to parse date of birth: {}", dob);
                builder.age(null);
                builder.isMinor(false);
            }
        }

        // Persona attribute
        String persona = (String) usResponse.get("persona");
        builder.persona(persona);
        builder.hasPersonaRepresentative(persona != null && persona.equalsIgnoreCase("PR"));

        // Metadata
        builder.retrievedAt(Instant.now().toString());

        Object expiresIn = usResponse.get("expiresIn");
        if (expiresIn instanceof Number) {
            builder.expiresIn(((Number) expiresIn).longValue());
        } else {
            builder.expiresIn(3600L); // Default 1 hour
        }

        return builder.build();
    }

    /**
     * Client Credentials Token Response DTO
     */
    private static class ClientCredentialsTokenResponse {
        public String access_token;
        public String token_type;
        public Long expires_in;
        public String scope;
    }
}
