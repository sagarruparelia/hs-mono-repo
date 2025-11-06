# BFF Reactive Migration Status

## ✅ Completed (100% Reactive)

### Core Services
- ✅ **OAuth2Service** - All methods return `Mono<T>`, no blocking calls
- ✅ **PSNService** - Fully reactive with `ReactiveRedisTemplate`
- ✅ **USService** - Fully reactive with `ReactiveRedisTemplate`
- ✅ **AccessDecisionService** - Reactive chains, error handling fixed
- ✅ **SessionService** - Fully reactive with `ReactiveRedisTemplate`

### Controllers
- ✅ **AuthController** - All endpoints return `Mono<ResponseEntity<T>>`
- ✅ **DocumentController** - Controller layer reactive (service needs work)
- ✅ **AntivirusCallbackController** - Fully reactive

### Infrastructure
- ✅ **RedisConfig** - Using `ReactiveRedisTemplate` and `ReactiveRedisConnectionFactory`
- ✅ **SecurityConfig** - Converted to WebFlux (`@EnableWebFluxSecurity`)
- ✅ **SessionValidationFilter** - Converted to `WebFilter`
- ✅ **DocumentRepository** - Converted to `ReactiveMongoRepository`

### Dependencies
- ✅ **pom.xml** - Only reactive dependencies (no spring-boot-starter-web)

---

## ⚠️ Needs Work (Blocking Code Wrapped)

### DocumentService (CRITICAL - 515 lines)

**Current State:** Blocking operations wrapped in `Mono.defer()` or `Mono.fromCallable()`

**Required Changes:**

1. **Method Signatures** - All need to return reactive types:
   ```java
   // Current (blocking)
   public DocumentUploadResponse initiateUpload(...)
   public List<UserDocument> finalizeUpload(...)
   public String getDownloadUrl(...)
   public Page<UserDocument> searchDocuments(...)
   public void deleteDocument(...)

   // Needed (reactive)
   public Mono<DocumentUploadResponse> initiateUpload(...)
   public Mono<List<UserDocument>> finalizeUpload(...)
   public Mono<String> getDownloadUrl(...)
   public Mono<Page<UserDocument>> searchDocuments(...)  // Or Flux<UserDocument>
   public Mono<Void> deleteDocument(...)
   ```

2. **Repository Calls** - Convert from blocking to reactive:
   ```java
   // Current (blocking)
   UserDocument doc = documentRepository.findById(id).orElseThrow(...)
   documentRepository.save(document)

   // Needed (reactive)
   return documentRepository.findById(id)
       .switchIfEmpty(Mono.error(new ResourceNotFoundException(...)))
   return documentRepository.save(document)
   ```

3. **S3Service** - Currently uses blocking AWS SDK:
   ```java
   // Current: Uses S3Client (blocking)
   private final S3Client s3Client;

   // Needed: Use S3AsyncClient (reactive)
   private final S3AsyncClient s3AsyncClient;

   // Methods need to return Mono:
   public Mono<String> generatePresignedUploadUrl(...)
   public Mono<String> generatePresignedDownloadUrl(...)
   ```

4. **AccessDecisionService Calls** - Change to reactive:
   ```java
   // Current (if blocking)
   AccessDecision decision = accessDecisionService.determineAccess(...)

   // Needed (reactive)
   return accessDecisionService.determineAccess(hsid, appType)
       .flatMap(decision -> ...)
   ```

---

## 📋 Pagination Issue

**Problem:** Spring Data Reactive doesn't support `Page<T>`.

**Current Impact:**
- DocumentController expects `Mono<Page<UserDocument>>`
- DocumentRepository returns `Flux<UserDocument>`

**Solutions:**

### Option 1: Custom PageSupport (Recommended)
```java
public Mono<Page<UserDocument>> searchDocuments(...) {
    Pageable pageable = PageRequest.of(page, size);

    Flux<UserDocument> docs = documentRepository.findByOwner(..., pageable);
    Mono<Long> count = documentRepository.countByOwner(...);

    return docs.collectList()
        .zipWith(count)
        .map(tuple -> new PageImpl<>(tuple.getT1(), pageable, tuple.getT2()));
}
```

### Option 2: Change API Contract
```java
// Response DTO
public class DocumentSearchResponse {
    private List<UserDocument> documents;
    private long totalCount;
    private int page;
    private int size;
}
```

---

## 🔧 Quick Fixes Needed

### 1. Fix DocumentService Method Signatures

**File:** `apps/bff/src/main/java/com/example/demo/service/DocumentService.java`

Add reactive wrappers (temporary solution):
```java
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

public Mono<DocumentUploadResponse> initiateUpload(
        DocumentUploadRequest request,
        UserSession session
) {
    return Mono.fromCallable(() -> initiateUploadBlocking(request, session))
            .subscribeOn(Schedulers.boundedElastic());
}

// Keep existing method but rename
private DocumentUploadResponse initiateUploadBlocking(...) {
    // existing implementation
}
```

### 2. Convert Repository Usage

Replace all blocking repository calls:
```java
// Before
UserDocument doc = documentRepository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException(...));

// After
return documentRepository.findById(id)
    .switchIfEmpty(Mono.error(new ResourceNotFoundException(...)));
```

### 3. S3Service Reactive Wrapper

Add dependency in `pom.xml`:
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3-async</artifactId>
</dependency>
```

Update S3Service:
```java
// Add async client
private final S3AsyncClient s3AsyncClient;

public Mono<String> generatePresignedUploadUrl(...) {
    return Mono.fromFuture(() ->
        s3Presigner.presignPutObject(...)
    );
}
```

---

## ✅ What Works Now

- ✅ Authentication flow (OAuth2 + Session)
- ✅ User info retrieval
- ✅ Access decision logic (US + PSN integration)
- ✅ Session management (Redis)
- ✅ Security configuration
- ✅ CORS setup
- ✅ WebFlux reactive pipeline

---

## 🚀 Next Steps Priority

1. **HIGH:** Fix DocumentService reactive wrappers
2. **HIGH:** Convert S3Service to use S3AsyncClient
3. **MEDIUM:** Implement pagination solution
4. **MEDIUM:** Full reactive conversion of DocumentService internals
5. **LOW:** Performance testing and optimization

---

## 🧪 Testing Recommendations

1. **Unit Tests:** Test each reactive method with StepVerifier
2. **Integration Tests:** Use embedded Redis/MongoDB
3. **Load Tests:** Verify reactive benefits under load
4. **Manual Testing:** Test authentication flow end-to-end

---

## 📝 Notes

- The application will compile but DocumentService operations may block the event loop
- Use `subscribeOn(Schedulers.boundedElastic())` for blocking operations temporarily
- Monitor thread usage to identify blocking issues
- Consider using Project Reactor's BlockHound in development to detect blocking calls

---

Last Updated: 2025-11-06
