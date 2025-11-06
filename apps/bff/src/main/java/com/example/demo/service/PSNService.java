package com.example.demo.service;

import com.example.demo.model.AccessLevelResponse;
import com.example.demo.model.SupportedMember;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * PSN (Provider Service Network) Service
 *
 * Handles OAuth2 client credentials flow to retrieve access level information
 * for logged-in members. This service acts as a proxy to PSN API using
 * machine-to-machine authentication.
 *
 * Flow:
 * 1. Get OAuth2 token using client credentials
 * 2. Call PSN access level API with member's ID
 * 3. Parse response containing supported members and access levels
 */
@Slf4j
@Service
public class PSNService {

    private static final String CACHE_KEY_PREFIX = "psn:access-level:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    private final WebClient webClient;
    private final ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;
    private final String psnTokenUri;
    private final String psnAccessLevelUri;
    private final String clientId;
    private final String clientSecret;
    private final String scope;

    // Cache for client credentials token - using Mono for reactive caching
    private Mono<String> cachedAccessTokenMono = Mono.empty();

    public PSNService(
            WebClient webClient,
            ReactiveRedisTemplate<String, Object> reactiveRedisTemplate,
            @Value("${psn.oauth2.token-uri}") String psnTokenUri,
            @Value("${psn.oauth2.access-level-uri}") String psnAccessLevelUri,
            @Value("${psn.oauth2.client-id}") String clientId,
            @Value("${psn.oauth2.client-secret}") String clientSecret,
            @Value("${psn.oauth2.scope:psn.access_level.read}") String scope
    ) {
        this.webClient = webClient;
        this.reactiveRedisTemplate = reactiveRedisTemplate;
        this.psnTokenUri = psnTokenUri;
        this.psnAccessLevelUri = psnAccessLevelUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
    }

    /**
     * Get access level information for a member from PSN
     * Cached in Redis for 30 minutes
     * Circuit breaker protects against PSN service failures
     *
     * @param memberIdType Type of member ID (HSID, OHID, MSID, EID)
     * @param memberIdValue The member's ID value
     * @return Mono of Access level response with supported members
     */
    @CircuitBreaker(name = "psnService", fallbackMethod = "getAccessLevelFallback")
    @Retry(name = "psnService")
    public Mono<AccessLevelResponse> getAccessLevel(String memberIdType, String memberIdValue) {
        log.debug("Fetching access level for member: {}={}", memberIdType, memberIdValue);

        String cacheKey = CACHE_KEY_PREFIX + memberIdType + ":" + memberIdValue;

        // Check cache first, then fetch from PSN if not found
        return reactiveRedisTemplate.opsForValue().get(cacheKey)
                .cast(AccessLevelResponse.class)
                .doOnNext(cached -> log.info("Access level found in cache for member: {}={}", memberIdType, memberIdValue))
                .switchIfEmpty(Mono.defer(() -> {
                    log.info("Access level not in cache, fetching from PSN for member: {}={}", memberIdType, memberIdValue);

                    return getClientCredentialsToken()
                            .flatMap(accessToken -> webClient.get()
                                    .uri(uriBuilder -> uriBuilder
                                            .path(psnAccessLevelUri)
                                            .queryParam("memberIdType", memberIdType)
                                            .queryParam("memberIdValue", memberIdValue)
                                            .build())
                                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                                    .retrieve()
                                    .bodyToMono(Map.class))
                            .flatMap(psnResponse -> {
                                if (psnResponse == null) {
                                    return Mono.error(new RuntimeException("PSN access level response is null"));
                                }
                                AccessLevelResponse response = parsePSNResponse(psnResponse);

                                // Cache the result for 30 minutes
                                return reactiveRedisTemplate.opsForValue()
                                        .set(cacheKey, response, CACHE_TTL)
                                        .thenReturn(response);
                            })
                            .doOnSuccess(response -> log.info("Successfully fetched and cached access level from PSN. Supported members: {}",
                                    response.getSupportedMembers() != null ? response.getSupportedMembers().size() : 0));
                }))
                .doOnError(e -> log.error("Failed to fetch access level from PSN", e))
                .onErrorMap(e -> new RuntimeException("PSN access level fetch failed: " + e.getMessage(), e));
    }

    /**
     * Get OAuth2 token using client credentials flow
     * Caches token until it expires
     * Circuit breaker protects against token service failures
     */
    @CircuitBreaker(name = "psnTokenService", fallbackMethod = "getClientCredentialsTokenFallback")
    @Retry(name = "psnTokenService")
    private Mono<String> getClientCredentialsToken() {
        log.info("Fetching PSN client credentials token");

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "client_credentials");
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("scope", scope);

        // Use cached Mono or create new one
        return Mono.defer(() -> webClient.post()
                .uri(psnTokenUri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(ClientCredentialsTokenResponse.class)
                .flatMap(tokenResponse -> {
                    if (tokenResponse == null || tokenResponse.access_token == null) {
                        return Mono.error(new RuntimeException("Invalid token response from PSN"));
                    }
                    log.info("Successfully obtained PSN client credentials token");
                    return Mono.just(tokenResponse.access_token);
                })
                .doOnError(e -> log.error("Failed to get PSN client credentials token", e))
                .onErrorMap(e -> new RuntimeException("PSN token fetch failed: " + e.getMessage(), e))
                .cache(Duration.ofMinutes(55))); // Cache for 55 minutes (assuming 1 hour token expiry)
    }

    /**
     * Parse PSN API response into AccessLevelResponse
     */
    @SuppressWarnings("unchecked")
    private AccessLevelResponse parsePSNResponse(Map<String, Object> psnResponse) {
        AccessLevelResponse.AccessLevelResponseBuilder builder = AccessLevelResponse.builder();

        // Member info
        builder.memberEid((String) psnResponse.get("memberEid"));
        builder.memberIdType((String) psnResponse.get("memberIdType"));
        builder.memberIdValue((String) psnResponse.get("memberIdValue"));

        // Access flags
        Object canViewOwn = psnResponse.get("canViewOwnData");
        builder.canViewOwnData(canViewOwn instanceof Boolean ? (Boolean) canViewOwn : true);

        // Supported members list
        List<SupportedMember> supportedMembers = new ArrayList<>();
        Object supportedMembersObj = psnResponse.get("supportedMembers");

        if (supportedMembersObj instanceof List) {
            List<Map<String, Object>> membersList = (List<Map<String, Object>>) supportedMembersObj;

            for (Map<String, Object> memberMap : membersList) {
                SupportedMember member = SupportedMember.builder()
                        .eid((String) memberMap.get("eid"))
                        .firstName((String) memberMap.get("firstName"))
                        .lastName((String) memberMap.get("lastName"))
                        .dateOfBirth((String) memberMap.get("dateOfBirth"))
                        .relationship((String) memberMap.get("relationship"))
                        .accessLevel((String) memberMap.get("accessLevel"))
                        .build();
                supportedMembers.add(member);
            }
        }

        builder.supportedMembers(supportedMembers);

        // Metadata
        builder.retrievedAt(Instant.now().toString());

        Object expiresIn = psnResponse.get("expiresIn");
        if (expiresIn instanceof Number) {
            builder.expiresIn(((Number) expiresIn).longValue());
        } else {
            builder.expiresIn(3600L); // Default 1 hour
        }

        return builder.build();
    }

    /**
     * Fallback method for getAccessLevel
     * Returns cached data if available, otherwise throws exception
     */
    private Mono<AccessLevelResponse> getAccessLevelFallback(String memberIdType, String memberIdValue, Exception e) {
        log.warn("Circuit breaker activated for PSN service. Attempting to serve stale cache for member: {}={}",
                memberIdType, memberIdValue, e);

        // Try to return stale cached data
        String cacheKey = CACHE_KEY_PREFIX + memberIdType + ":" + memberIdValue;
        return reactiveRedisTemplate.opsForValue().get(cacheKey)
                .cast(AccessLevelResponse.class)
                .doOnNext(cached -> log.info("Serving stale cached access level for member: {}={}", memberIdType, memberIdValue))
                .switchIfEmpty(Mono.defer(() -> {
                    log.error("No cached data available for member: {}={}. Circuit breaker fallback failed.", memberIdType, memberIdValue);
                    return Mono.error(new RuntimeException("PSN service unavailable and no cached data found", e));
                }));
    }

    /**
     * Fallback method for getClientCredentialsToken
     * Fails immediately as token is required
     */
    private Mono<String> getClientCredentialsTokenFallback(Exception e) {
        log.error("Circuit breaker activated for PSN token service. No fallback available.", e);
        return Mono.error(new RuntimeException("PSN token service unavailable", e));
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
