package com.example.demo.service;

import com.example.demo.exception.AccessDeniedException;
import com.example.demo.exception.InvalidRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.*;
import com.example.demo.repository.DocumentRepository;
import com.example.demo.util.MongoQueryUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing document metadata and lifecycle
 */
@Slf4j
@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final S3Service s3Service;
    private final AccessDecisionService accessDecisionService;

    private static final long MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    private static final int MAX_FILES_PER_UPLOAD = 5;
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    public DocumentService(
            DocumentRepository documentRepository,
            S3Service s3Service,
            AccessDecisionService accessDecisionService
    ) {
        this.documentRepository = documentRepository;
        this.s3Service = s3Service;
        this.accessDecisionService = accessDecisionService;
    }

    /**
     * Initiate document upload - generate presigned URLs
     * Called when user selects files (before clicking "Upload")
     */
    public DocumentUploadResponse initiateUpload(
            DocumentUploadRequest request,
            UserSession session
    ) {
        log.info("Initiating upload for {} files by user {}",
                request.getFiles().size(), session.getUserInfo().getPreferredUsername());

        // Validate request
        validateUploadRequest(request, session);

        List<DocumentUploadResponse.UploadInfo> uploadInfos = new ArrayList<>();

        for (DocumentUploadRequest.FileUploadInfo fileInfo : request.getFiles()) {
            // Generate temporary document ID
            String tempDocumentId = UUID.randomUUID().toString();

            // Generate temp S3 key
            String tempS3Key = s3Service.generateTempS3Key(
                    session.getSessionId(),
                    fileInfo.getFileName()
            );

            // Generate presigned URL for upload
            String presignedUrl = s3Service.generatePresignedUploadUrl(
                    tempS3Key,
                    fileInfo.getContentType()
            );

            // Create temporary document metadata
            UserDocument tempUserDocument = createTempDocument(
                    tempDocumentId,
                    fileInfo,
                    tempS3Key,
                    request.getOwnerIdType(),
                    request.getOwnerIdValue(),
                    session
            );

            documentRepository.save(tempUserDocument);

            // Add to response
            uploadInfos.add(DocumentUploadResponse.UploadInfo.builder()
                    .tempDocumentId(tempDocumentId)
                    .fileName(fileInfo.getFileName())
                    .presignedUrl(presignedUrl)
                    .s3Key(tempS3Key)
                    .expiresIn(15 * 60L) // 15 minutes
                    .build());

            log.info("Generated presigned URL for temp document: {}", tempDocumentId);
        }

        return DocumentUploadResponse.builder()
                .uploads(uploadInfos)
                .build();
    }

    /**
     * Finalize document upload - move from temp to permanent storage
     * Called when user clicks "Upload" button after selecting category
     */
    public List<UserDocument> finalizeUpload(
            DocumentFinalizeRequest request,
            UserSession session
    ) {
        log.info("Finalizing upload for {} documents by user {}",
                request.getTempDocumentIds().size(), session.getUserInfo().getPreferredUsername());

        List<UserDocument> finalizedUserDocuments = new ArrayList<>();

        for (String tempDocumentId : request.getTempDocumentIds()) {
            UserDocument tempUserDocument = documentRepository.findById(tempDocumentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Temporary document not found: " + tempDocumentId));

            // Verify ownership (user can only finalize their own temp uploads)
            if (!tempUserDocument.getSessionId().equals(session.getSessionId())) {
                throw new AccessDeniedException("Cannot finalize document from different session");
            }

            // Verify document is still temporary
            if (!tempUserDocument.isTemporary()) {
                throw new InvalidRequestException("Document already finalized: " + tempDocumentId);
            }

            // Check if file exists in S3
            if (!s3Service.fileExists(tempUserDocument.getTempS3Key())) {
                throw new ResourceNotFoundException("File not uploaded to S3: " + tempUserDocument.getTempS3Key());
            }

            // SECURITY: Check antivirus scan status
            validateAntivirusStatus(tempUserDocument);

            // Generate permanent S3 key
            String permanentS3Key = s3Service.generatePermanentS3Key(
                    tempUserDocument.getOwnerIdType(),
                    tempUserDocument.getOwnerIdValue(),
                    tempDocumentId,
                    tempUserDocument.getOriginalFileName()
            );

            // Move file from temp to permanent location
            s3Service.moveFile(tempUserDocument.getTempS3Key(), permanentS3Key);

            // Update document metadata
            tempUserDocument.setStatus(UserDocument.DocumentStatus.ACTIVE);
            tempUserDocument.setCategory(request.getCategory());
            tempUserDocument.setDescription(request.getDescription());
            tempUserDocument.setTags(request.getTags() != null ? request.getTags() : new ArrayList<>());
            tempUserDocument.setS3Key(permanentS3Key);
            tempUserDocument.setFinalizedAt(Instant.now());
            tempUserDocument.setLastModifiedAt(Instant.now());

            UserDocument finalizedUserDocument = documentRepository.save(tempUserDocument);
            finalizedUserDocuments.add(finalizedUserDocument);

            log.info("Finalized document: {} -> {}", tempDocumentId, permanentS3Key);
        }

        return finalizedUserDocuments;
    }

    /**
     * Get download URL for a document
     */
    public String getDownloadUrl(String documentId, UserSession session) {
        UserDocument userDocument = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Verify access
        validateDocumentAccess(userDocument, session, false);

        // Update last accessed timestamp
        userDocument.setLastAccessedAt(Instant.now());
        documentRepository.save(userDocument);

        // Generate presigned download URL
        return s3Service.generatePresignedDownloadUrl(userDocument.getS3Key());
    }

    /**
     * Search documents with filters
     */
    public Page<UserDocument> searchDocuments(
            DocumentSearchRequest request,
            UserSession session
    ) {
        log.info("Searching documents for owner: {}={}", request.getOwnerIdType(), request.getOwnerIdValue());

        // Verify access to owner's documents
        validateSearchAccess(request.getOwnerIdType(), request.getOwnerIdValue(), session, request.getIncludeSensitive());

        // Build pageable
        Sort.Direction direction = "ASC".equalsIgnoreCase(request.getSortDirection())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(direction, request.getSortBy())
        );

        // Execute search
        if (request.getSearchQuery() != null && !request.getSearchQuery().isEmpty()) {
            // Sanitize search query to prevent NoSQL injection
            String sanitizedQuery = MongoQueryUtil.sanitizeRegexInput(
                MongoQueryUtil.validateQueryLength(request.getSearchQuery(), 200)
            );

            return documentRepository.searchDocuments(
                    request.getOwnerIdType(),
                    request.getOwnerIdValue(),
                    UserDocument.DocumentStatus.ACTIVE,
                    sanitizedQuery,
                    pageable
            );
        } else if (request.getCategories() != null && !request.getCategories().isEmpty()) {
            // TODO: Implement category filter
            // For now, return all active documents
            return documentRepository.findByOwnerIdTypeAndOwnerIdValueAndStatus(
                    request.getOwnerIdType(),
                    request.getOwnerIdValue(),
                    UserDocument.DocumentStatus.ACTIVE,
                    pageable
            );
        } else {
            return documentRepository.findByOwnerIdTypeAndOwnerIdValueAndStatus(
                    request.getOwnerIdType(),
                    request.getOwnerIdValue(),
                    UserDocument.DocumentStatus.ACTIVE,
                    pageable
            );
        }
    }

    /**
     * Delete a document (soft delete)
     */
    public void deleteDocument(String documentId, UserSession session) {
        UserDocument userDocument = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Verify access (must be owner or have DAA)
        validateDocumentAccess(userDocument, session, true);

        // Soft delete
        userDocument.setStatus(UserDocument.DocumentStatus.DELETED);
        userDocument.setDeletedAt(Instant.now());
        documentRepository.save(userDocument);

        // Optionally: delete from S3 immediately or via scheduled job
        // s3Service.deleteFile(document.getS3Key());

        log.info("Deleted document: {}", documentId);
    }

    /**
     * Clean up abandoned temporary files
     * Called by scheduled job
     */
    public void cleanupAbandonedTempFiles() {
        log.info("Starting cleanup of abandoned temporary files");

        // Find temp documents older than 1 hour
        Instant oneHourAgo = Instant.now().minusSeconds(3600);
        List<UserDocument> abandonedDocs = documentRepository.findByStatusAndUploadedAtBefore(
                UserDocument.DocumentStatus.TEMPORARY,
                oneHourAgo
        );

        log.info("Found {} abandoned temporary documents", abandonedDocs.size());

        for (UserDocument doc : abandonedDocs) {
            try {
                // Delete from S3
                if (doc.getTempS3Key() != null) {
                    s3Service.deleteFile(doc.getTempS3Key());
                }

                // Delete metadata
                documentRepository.delete(doc);

                log.info("Cleaned up abandoned document: {}", doc.getDocumentId());
            } catch (Exception e) {
                log.error("Failed to cleanup document: {}", doc.getDocumentId(), e);
            }
        }

        log.info("Cleanup completed. Removed {} abandoned documents", abandonedDocs.size());
    }

    /**
     * Create temporary document metadata
     */
    private UserDocument createTempDocument(
            String tempDocumentId,
            DocumentUploadRequest.FileUploadInfo fileInfo,
            String tempS3Key,
            String ownerIdType,
            String ownerIdValue,
            UserSession session
    ) {
        return UserDocument.builder()
                .documentId(tempDocumentId)
                .fileName(s3Service.sanitizeFilename(fileInfo.getFileName()))
                .originalFileName(fileInfo.getFileName())
                .fileSize(fileInfo.getFileSize())
                .contentType(fileInfo.getContentType())
                .tempS3Key(tempS3Key)
                .s3Bucket(s3Service.getBucketName())
                .ownerIdType(ownerIdType)
                .ownerIdValue(ownerIdValue)
                .uploadedByIdType(session.getUserInfo().getIdType())
                .uploadedByIdValue(session.getUserInfo().getIdValue())
                .uploadedByFirstName(session.getUserInfo().getFirstName())
                .uploadedByLastName(session.getUserInfo().getLastName())
                .uploadedAt(Instant.now())
                .status(UserDocument.DocumentStatus.TEMPORARY)
                .sessionId(session.getSessionId())
                .isSensitive(true) // Default: all documents are sensitive
                .avStatus(UserDocument.AntivirusStatus.PENDING) // Waiting for AV scan
                .build();
    }

    /**
     * Validate antivirus scan status before finalizing document
     * Prevents infected files from being moved to permanent storage
     */
    private void validateAntivirusStatus(UserDocument document) {
        UserDocument.AntivirusStatus avStatus = document.getAvStatus();

        if (avStatus == null) {
            // No AV status set - this shouldn't happen
            log.warn("Document has no AV status: {}", document.getDocumentId());
            throw new InvalidRequestException("Document has not been scanned for viruses");
        }

        switch (avStatus) {
            case CLEAN:
                // File is safe, proceed with finalization
                log.info("Document passed AV scan: {}", document.getDocumentId());
                break;

            case INFECTED:
                // File contains malware - DO NOT finalize
                log.error("SECURITY: Attempt to finalize infected document: {} - Virus: {}",
                    document.getDocumentId(), document.getVirusName());
                throw new AccessDeniedException("File contains malware: " + document.getVirusName());

            case PENDING:
                // Still waiting for AV scan
                log.warn("Document AV scan pending: {}", document.getDocumentId());
                throw new InvalidRequestException(
                    "File is still being scanned for viruses. Please try again in a few moments.");

            case SCANNING:
                // Currently being scanned
                log.info("Document AV scan in progress: {}", document.getDocumentId());
                throw new InvalidRequestException(
                    "File is currently being scanned for viruses. Please try again in a few moments.");

            case SCAN_ERROR:
                // AV scan failed
                log.error("AV scan failed for document: {}", document.getDocumentId());
                throw new InvalidRequestException(
                    "Virus scan failed. Please contact support or try uploading again.");

            default:
                log.error("Unknown AV status: {} for document: {}", avStatus, document.getDocumentId());
                throw new InvalidRequestException("Unknown virus scan status");
        }
    }

    /**
     * Validate upload request
     */
    private void validateUploadRequest(DocumentUploadRequest request, UserSession session) {
        // Validate number of files
        if (request.getFiles() == null || request.getFiles().isEmpty()) {
            throw new InvalidRequestException("No files to upload");
        }

        if (request.getFiles().size() > MAX_FILES_PER_UPLOAD) {
            throw new InvalidRequestException("Cannot upload more than " + MAX_FILES_PER_UPLOAD + " files at once");
        }

        // Validate each file
        for (DocumentUploadRequest.FileUploadInfo fileInfo : request.getFiles()) {
            // Check file size
            if (fileInfo.getFileSize() > MAX_FILE_SIZE) {
                throw new InvalidRequestException("File too large: " + fileInfo.getFileName() +
                        " (max: " + (MAX_FILE_SIZE / 1024 / 1024) + " MB)");
            }

            // Check content type
            if (!ALLOWED_CONTENT_TYPES.contains(fileInfo.getContentType().toLowerCase())) {
                throw new InvalidRequestException("Unsupported file type: " + fileInfo.getContentType());
            }
        }

        // Validate access to upload for this owner
        String loggedInIdType = session.getUserInfo().getIdType();
        String loggedInIdValue = session.getUserInfo().getIdValue();

        // If uploading for someone else, must have DAA access
        boolean uploadingForSelf = request.getOwnerIdType().equals(loggedInIdType)
                && request.getOwnerIdValue().equals(loggedInIdValue);

        if (!uploadingForSelf) {
            // Check if user has DAA access for this owner
            AccessDecision decision = session.getAccessDecision();
            if (decision == null) {
                throw new AccessDeniedException("Access decision not available");
            }

            boolean hasDAA = decision.getViewableMembers().stream()
                    .anyMatch(member ->
                            member.getEid().equals(request.getOwnerIdValue()) &&
                                    Boolean.TRUE.equals(member.getHasDigitalAccountAccess())
                    );

            if (!hasDAA) {
                throw new AccessDeniedException("No DAA access to upload documents for this member");
            }
        }
    }

    /**
     * Validate access to view a document
     */
    private void validateDocumentAccess(UserDocument userDocument, UserSession session, boolean requireDAA) {
        String loggedInIdType = session.getUserInfo().getIdType();
        String loggedInIdValue = session.getUserInfo().getIdValue();

        // Check if viewing own document
        boolean isOwnDocument = userDocument.getOwnerIdType().equals(loggedInIdType)
                && userDocument.getOwnerIdValue().equals(loggedInIdValue);

        if (isOwnDocument) {
            return; // Can always view own documents
        }

        // Viewing someone else's document
        AccessDecision decision = session.getAccessDecision();
        if (decision == null) {
            throw new AccessDeniedException("Access decision not available");
        }

        // Find member in viewable list
        SupportedMember member = decision.getViewableMembers().stream()
                .filter(m -> m.getEid().equals(userDocument.getOwnerIdValue()))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException("No access to this member's documents"));

        // Check if has DAA (for write operations)
        if (requireDAA && !Boolean.TRUE.equals(member.getHasDigitalAccountAccess())) {
            throw new AccessDeniedException("No DAA access for this member");
        }

        // Check if document is sensitive (requires ROI)
        if (Boolean.TRUE.equals(userDocument.getIsSensitive())
                && !Boolean.TRUE.equals(member.getHasSensitiveDataAccess())) {
            throw new AccessDeniedException("No ROI access for sensitive documents");
        }
    }

    /**
     * Validate access for document search
     */
    private void validateSearchAccess(String ownerIdType, String ownerIdValue, UserSession session, boolean includeSensitive) {
        String loggedInIdType = session.getUserInfo().getIdType();
        String loggedInIdValue = session.getUserInfo().getIdValue();

        // Check if searching own documents
        boolean isOwnDocuments = ownerIdType.equals(loggedInIdType) && ownerIdValue.equals(loggedInIdValue);

        if (isOwnDocuments) {
            return; // Can always search own documents
        }

        // Searching someone else's documents
        AccessDecision decision = session.getAccessDecision();
        if (decision == null) {
            throw new AccessDeniedException("Access decision not available");
        }

        // Find member in viewable list
        SupportedMember member = decision.getViewableMembers().stream()
                .filter(m -> m.getEid().equals(ownerIdValue))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException("No access to this member's documents"));

        // If requesting sensitive documents, must have ROI
        if (includeSensitive && !Boolean.TRUE.equals(member.getHasSensitiveDataAccess())) {
            throw new AccessDeniedException("No ROI access for sensitive documents");
        }
    }
}
