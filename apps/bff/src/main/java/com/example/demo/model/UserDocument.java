package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Document metadata stored in MongoDB
 * Actual files stored in S3
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documents")
public class UserDocument implements Serializable {

    @Id
    private String documentId;

    // File information
    private String fileName; // Sanitized filename
    private String originalFileName; // Original user-provided filename
    private Long fileSize; // Bytes
    private String contentType; // MIME type
    private DocumentCategory category;

    // S3 location
    private String s3Key; // Full S3 path
    private String s3Bucket;

    // Ownership - whose document this is
    @Indexed
    private String ownerIdType; // HSID, EID, OHID, MSID
    @Indexed
    private String ownerIdValue; // The actual ID value
    private String ownerFirstName;
    private String ownerLastName;

    // Upload information - who uploaded it
    @Indexed
    private String uploadedByIdType;
    @Indexed
    private String uploadedByIdValue;
    private String uploadedByFirstName;
    private String uploadedByLastName;
    @Indexed
    private Instant uploadedAt;

    // Security and access
    @Builder.Default
    private Boolean isSensitive = true; // Default: all documents are sensitive

    // Metadata for search
    private String description;
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    private String extractedText; // Future: OCR text for search

    // Status
    @Indexed
    private DocumentStatus status;
    @Indexed
    private Instant finalizedAt; // When user clicked "Upload" button
    private Instant deletedAt;

    // Temporary upload tracking
    @Indexed
    private String sessionId; // For temp files cleanup
    private String tempS3Key; // Temporary S3 location before finalization

    // Antivirus scan status
    @Indexed
    private AntivirusStatus avStatus;
    private String virusName; // If infected, name of virus
    private Instant avScannedAt; // When AV scan completed

    // Audit
    private Instant lastModifiedAt;
    private Instant lastAccessedAt;

    public enum AntivirusStatus {
        PENDING,      // Waiting for AV scan
        SCANNING,     // Currently being scanned
        CLEAN,        // Passed AV scan
        INFECTED,     // Failed AV scan - contains malware
        SCAN_ERROR    // AV scan failed due to error
    }

    public enum DocumentCategory {
        MEDICAL_RECORD,
        LAB_RESULT,
        PRESCRIPTION,
        INSURANCE_CARD,
        IMMUNIZATION_RECORD,
        MARKSHEET,
        IDENTIFICATION,
        OTHER
    }

    public enum DocumentStatus {
        TEMPORARY,    // Uploaded but not finalized
        ACTIVE,       // Finalized and visible
        DELETED       // Soft deleted
    }

    /**
     * Get display name for the owner
     */
    public String getOwnerDisplayName() {
        if (ownerFirstName != null && ownerLastName != null) {
            return ownerFirstName + " " + ownerLastName;
        }
        return ownerIdValue;
    }

    /**
     * Get display name for uploader
     */
    public String getUploadedByDisplayName() {
        if (uploadedByFirstName != null && uploadedByLastName != null) {
            return uploadedByFirstName + " " + uploadedByLastName;
        }
        return uploadedByIdValue;
    }

    /**
     * Check if document is temporary (not finalized)
     */
    public boolean isTemporary() {
        return DocumentStatus.TEMPORARY.equals(status);
    }

    /**
     * Check if document is active and viewable
     */
    public boolean isActive() {
        return DocumentStatus.ACTIVE.equals(status) && deletedAt == null;
    }
}
