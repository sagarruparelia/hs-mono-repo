package com.example.demo.service;

import com.example.demo.model.BiometricInfo;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

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
    private final ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;
    private final String usTokenUri;
    private final String usBiometricUri;
    private final String clientId;
    private final String clientSecret;
    private final String scope;

    // Cache for client credentials token - using Mono for reactive caching
    private Mono<String> cachedAccessTokenMono = Mono.empty();

    public USService(
            WebClient webClient,
            ReactiveRedisTemplate<String, Object> reactiveRedisTemplate,
            @Value("${us.oauth2.token-uri}") String usTokenUri,
            @Value("${us.oauth2.biometric-uri}") String usBiometricUri,
            @Value("${us.oauth2.client-id}") String clientId,
            @Value("${us.oauth2.client-secret}") String clientSecret,
            @Value("${us.oauth2.scope:us.biometric.read}") String scope
    ) {
        this.webClient = webClient;
        this.reactiveRedisTemplate = reactiveRedisTemplate;
        this.usTokenUri = usTokenUri;
        this.usBiometricUri = usBiometricUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
    }

    /**
     * Get biometric information for a member from US
     * Cached in Redis for 30 minutes
     * Circuit breaker protects against US service failures
     *
     * @param hsid Member's HSID (unique identifier)
     * @return Mono of Biometric info including age, DOB, persona
     */
    @CircuitBreaker(name = "usService", fallbackMethod = "getBiometricInfoFallback")
    @Retry(name = "usService")
    public Mono<BiometricInfo> getBiometricInfo(String hsid) {
        log.debug("Fetching biometric info for HSID: {}", hsid);

        String cacheKey = CACHE_KEY_PREFIX + hsid;

        // Check cache first, then fetch from US if not found
        return reactiveRedisTemplate.opsForValue().get(cacheKey)
                .cast(BiometricInfo.class)
                .doOnNext(cached -> log.info("Biometric info found in cache for HSID: {}", hsid))
                .switchIfEmpty(Mono.defer(() -> {
                    log.info("Biometric info not in cache, fetching from US for HSID: {}", hsid);

                    return getClientCredentialsToken()
                            .flatMap(accessToken -> webClient.get()
                                    .uri(uriBuilder -> uriBuilder
                                            .path(usBiometricUri)
                                            .queryParam("hsid", hsid)
                                            .build())
                                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                                    .retrieve()
                                    .bodyToMono(Map.class))
                            .flatMap(usResponse -> {
                                if (usResponse == null) {
                                    return Mono.error(new RuntimeException("US biometric response is null"));
                                }
                                BiometricInfo biometricInfo = parseUSResponse(usResponse);

                                // Cache the result for 30 minutes
                                return reactiveRedisTemplate.opsForValue()
                                        .set(cacheKey, biometricInfo, CACHE_TTL)
                                        .thenReturn(biometricInfo);
                            })
                            .doOnSuccess(biometricInfo -> log.info("Successfully fetched and cached biometric info from US. Age: {}, IsMinor: {}, HasPR: {}",
                                    biometricInfo.getAge(),
                                    biometricInfo.getIsMinor(),
                                    biometricInfo.getHasPersonaRepresentative()));
                }))
                .doOnError(e -> log.error("Failed to fetch biometric info from US", e))
                .onErrorMap(e -> new RuntimeException("US biometric fetch failed: " + e.getMessage(), e));
    }

    /**
     * Get OAuth2 token using client credentials flow
     * Caches token until it expires
     * Circuit breaker protects against token service failures
     */
    @CircuitBreaker(name = "usTokenService", fallbackMethod = "getClientCredentialsTokenFallback")
    @Retry(name = "usTokenService")
    private Mono<String> getClientCredentialsToken() {
        log.info("Fetching US client credentials token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "client_credentials");
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("scope", scope);

        // Use cached Mono or create new one
        return Mono.defer(() -> webClient.post()
                .uri(usTokenUri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(ClientCredentialsTokenResponse.class)
                .flatMap(tokenResponse -> {
                    if (tokenResponse == null || tokenResponse.access_token == null) {
                        return Mono.error(new RuntimeException("Invalid token response from US"));
                    }
                    log.info("Successfully obtained US client credentials token");
                    return Mono.just(tokenResponse.access_token);
                })
                .doOnError(e -> log.error("Failed to get US client credentials token", e))
                .onErrorMap(e -> new RuntimeException("US token fetch failed: " + e.getMessage(), e))
                .cache(Duration.ofMinutes(55))); // Cache for 55 minutes (assuming 1 hour token expiry)
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
     * Fallback method for getBiometricInfo
     * Returns cached data if available, otherwise throws exception
     */
    private Mono<BiometricInfo> getBiometricInfoFallback(String hsid, Exception e) {
        log.warn("Circuit breaker activated for US service. Attempting to serve stale cache for HSID: {}", hsid, e);

        // Try to return stale cached data
        String cacheKey = CACHE_KEY_PREFIX + hsid;
        return reactiveRedisTemplate.opsForValue().get(cacheKey)
                .cast(BiometricInfo.class)
                .doOnNext(cached -> log.info("Serving stale cached biometric info for HSID: {}", hsid))
                .switchIfEmpty(Mono.defer(() -> {
                    log.error("No cached data available for HSID: {}. Circuit breaker fallback failed.", hsid);
                    return Mono.error(new RuntimeException("US service unavailable and no cached data found", e));
                }));
    }

    /**
     * Fallback method for getClientCredentialsToken
     * Fails immediately as token is required
     */
    private Mono<String> getClientCredentialsTokenFallback(Exception e) {
        log.error("Circuit breaker activated for US token service. No fallback available.", e);
        return Mono.error(new RuntimeException("US token service unavailable", e));
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
