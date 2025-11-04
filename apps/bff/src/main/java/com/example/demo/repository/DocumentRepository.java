package com.example.demo.repository;

import com.example.demo.model.UserDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Document entities in MongoDB
 */
@Repository
public interface DocumentRepository extends MongoRepository<UserDocument, String> {

    /**
     * Find all documents by owner
     */
    Page<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find all documents uploaded by a user
     */
    Page<UserDocument> findByUploadedByIdTypeAndUploadedByIdValueAndStatus(
            String uploadedByIdType,
            String uploadedByIdValue,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find documents by owner and category
     */
    Page<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndCategoryAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentCategory category,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Find temporary documents by session (for cleanup)
     */
    List<UserDocument> findByStatusAndSessionId(
            UserDocument.DocumentStatus status,
            String sessionId
    );

    /**
     * Find temporary documents older than a certain time (for cleanup)
     */
    List<UserDocument> findByStatusAndUploadedAtBefore(
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
    Page<UserDocument> searchDocuments(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status,
            String searchQuery,
            Pageable pageable
    );

    /**
     * Find documents by tags
     */
    Page<UserDocument> findByOwnerIdTypeAndOwnerIdValueAndTagsInAndStatus(
            String ownerIdType,
            String ownerIdValue,
            List<String> tags,
            UserDocument.DocumentStatus status,
            Pageable pageable
    );

    /**
     * Count documents by owner
     */
    long countByOwnerIdTypeAndOwnerIdValueAndStatus(
            String ownerIdType,
            String ownerIdValue,
            UserDocument.DocumentStatus status
    );

    /**
     * Find document by temporary S3 key (for AV callback)
     */
    Optional<UserDocument> findByTempS3Key(String tempS3Key);

    /**
     * Find documents pending AV scan
     */
    List<UserDocument> findByAvStatus(UserDocument.AntivirusStatus avStatus);
}
