package com.example.demo.repository;

import com.example.demo.model.UserDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

/**
 * Reactive Repository for Document entities in MongoDB
 */
@Repository
public interface DocumentRepository extends ReactiveMongoRepository<UserDocument, String> {

    /**
     * Find all documents by owner
     */
    Flux<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find all documents uploaded by a user
     */
    Flux<UserDocument> findByUploadedByIdTypeAndUploadedByIdValueAndStatus(
            String uploadedByIdType,
            String uploadedByIdValue,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find documents by owner and category
     */
    Flux<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndCategoryAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentCategory category,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find temporary documents by session (for cleanup)
     */
    Flux<UserDocument> findByStatusAndSessionId(
            UserDocument.DocumentStatus status,
            String sessionId
    );

    /**
     * Find temporary documents older than a certain time (for cleanup)
     */
    Flux<UserDocument> findByStatusAndUploadedAtBefore(
            UserDocument.DocumentStatus status,
            Instant uploadedBefore
    );

    /**
     * Search documents by filename or description
     */
    @Query("{ " +
            "'ownerIdType': ?0, " +
            "'ownerIdValue': ?1, " +
            "'status': ?2, " +
            "$or: [" +
            "  {'fileName': {$regex: ?3, $options: 'i'}}, " +
            "  {'originalFileName': {$regex: ?3, $options: 'i'}}, " +
            "  {'description': {$regex: ?3, $options: 'i'}}, " +
            "  {'extractedText': {$regex: ?3, $options: 'i'}}" +
            "]" +
            "}")
    Flux<UserDocument> searchDocuments(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status,
            String searchQuery,
            Pageable pageable
    );

    /**
     * Find documents by tags
     */
    Flux<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndTagsInAndStatus(
            String ownerIdType,
            String ownerIdValue,
            List<String> tags,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Count documents by owner
     */
    Mono<Long> countByOwnerIdTypeAndOwnerIdValueAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status
    );

    /**
     * Find document by temporary S3 key (for AV callback)
     */
    Mono<UserDocument> findByTempS3Key(String tempS3Key);

    /**
     * Find documents pending AV scan
     */
    Flux<UserDocument> findByAvStatus(UserDocument.AntivirusStatus avStatus);
}
