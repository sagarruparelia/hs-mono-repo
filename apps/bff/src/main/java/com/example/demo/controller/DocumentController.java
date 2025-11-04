package com.example.demo.controller;

import com.example.demo.exception.UnauthorizedException;
import com.example.demo.model.*;
import com.example.demo.service.DocumentService;
import com.example.demo.service.SessionService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * REST API for document management
 */
@Slf4j
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final SessionService sessionService;

    public DocumentController(DocumentService documentService, SessionService sessionService) {
        this.documentService = documentService;
        this.sessionService = sessionService;
    }

    /**
     * Initiate document upload
     * Returns presigned URLs for direct S3 upload
     *
     * POST /api/documents/upload/initiate
     * Body: {
     *   "files": [
     *     { "fileName": "lab-results.pdf", "contentType": "application/pdf", "fileSize": 1024000 }
     *   ],
     *   "ownerIdType": "EID",
     *   "ownerIdValue": "E123456"
     * }
     *
     * Response: {
     *   "uploads": [
     *     {
     *       "tempDocumentId": "uuid",
     *       "fileName": "lab-results.pdf",
     *       "presignedUrl": "https://s3.amazonaws.com/...",
     *       "s3Key": "temp/session-id/timestamp-lab-results.pdf",
     *       "expiresIn": 900
     *     }
     *   ]
     * }
     */
    @PostMapping("/upload/initiate")
    public ResponseEntity<DocumentUploadResponse> initiateUpload(
            HttpServletRequest request,
            @Valid @RequestBody DocumentUploadRequest uploadRequest
    ) {
        log.info("Initiating document upload for {} files", uploadRequest.getFiles().size());

        UserSession session = sessionService.getSessionFromRequest(request)
                .orElseThrow(() -> new UnauthorizedException("No valid session"));

        DocumentUploadResponse response = documentService.initiateUpload(uploadRequest, session);

        return ResponseEntity.ok(response);
    }

    /**
     * Finalize document upload
     * Called after user uploads files to S3 and clicks "Upload" button
     *
     * POST /api/documents/upload/finalize
     * Body: {
     *   "tempDocumentIds": ["uuid1", "uuid2"],
     *   "category": "MEDICAL_RECORD",
     *   "description": "Lab results from annual checkup",
     *   "tags": ["lab", "annual"]
     * }
     *
     * Response: [
     *   { documentId, fileName, category, uploadedAt, ... }
     * ]
     */
    @PostMapping("/upload/finalize")
    public ResponseEntity<List<UserDocument>> finalizeUpload(
            HttpServletRequest request,
            @Valid @RequestBody DocumentFinalizeRequest finalizeRequest
    ) {
        log.info("Finalizing upload for {} documents", finalizeRequest.getTempDocumentIds().size());

        UserSession session = sessionService.getSessionFromRequest(request)
                .orElseThrow(() -> new UnauthorizedException("No valid session"));

        List<UserDocument> userDocuments = documentService.finalizeUpload(finalizeRequest, session);

        return ResponseEntity.ok(userDocuments);
    }

    /**
     * Search/list documents with filters
     *
     * POST /api/documents/search
     * Body: {
     *   "ownerIdType": "EID",
     *   "ownerIdValue": "E123456",
     *   "searchQuery": "lab",
     *   "categories": ["MEDICAL_RECORD"],
     *   "uploadedAfter": "2024-01-01T00:00:00Z",
     *   "includeSensitive": true,
     *   "page": 0,
     *   "size": 20,
     *   "sortBy": "uploadedAt",
     *   "sortDirection": "DESC"
     * }
     */
    @PostMapping("/search")
    public ResponseEntity<Page<UserDocument>> searchDocuments(
            HttpServletRequest request,
            @Valid @RequestBody DocumentSearchRequest searchRequest
    ) {
        log.info("Searching documents for owner: {}={}",
                searchRequest.getOwnerIdType(), searchRequest.getOwnerIdValue());

        UserSession session = sessionService.getSessionFromRequest(request)
                .orElseThrow(() -> new UnauthorizedException("No valid session"));

        Page<UserDocument> documents = documentService.searchDocuments(searchRequest, session);

        return ResponseEntity.ok(documents);
    }

    /**
     * Get download URL for a document
     *
     * GET /api/documents/{documentId}/download
     *
     * Response: {
     *   "downloadUrl": "https://s3.amazonaws.com/...",
     *   "expiresIn": 900
     * }
     */
    @GetMapping("/{documentId}/download")
    public ResponseEntity<Map<String, Object>> getDownloadUrl(
            HttpServletRequest request,
            @PathVariable String documentId
    ) {
        log.info("Generating download URL for document: {}", documentId);

        UserSession session = sessionService.getSessionFromRequest(request)
                .orElseThrow(() -> new UnauthorizedException("No valid session"));

        String downloadUrl = documentService.getDownloadUrl(documentId, session);

        return ResponseEntity.ok(Map.of(
                "downloadUrl", downloadUrl,
                "expiresIn", 15 * 60 // 15 minutes
        ));
    }

    /**
     * Delete a document (soft delete)
     *
     * DELETE /api/documents/{documentId}
     */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            HttpServletRequest request,
            @PathVariable String documentId
    ) {
        log.info("Deleting document: {}", documentId);

        UserSession session = sessionService.getSessionFromRequest(request)
                .orElseThrow(() -> new UnauthorizedException("No valid session"));

        documentService.deleteDocument(documentId, session);

        return ResponseEntity.noContent().build();
    }

    /**
     * Get document categories
     *
     * GET /api/documents/categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<Map<String, String>>> getCategories() {
        List<Map<String, String>> categories = List.of(
                Map.of("value", "MEDICAL_RECORD", "label", "Medical Record"),
                Map.of("value", "LAB_RESULT", "label", "Lab Result"),
                Map.of("value", "PRESCRIPTION", "label", "Prescription"),
                Map.of("value", "INSURANCE_CARD", "label", "Insurance Card"),
                Map.of("value", "IMMUNIZATION_RECORD", "label", "Immunization Record"),
                Map.of("value", "MARKSHEET", "label", "Marksheet / Transcript"),
                Map.of("value", "IDENTIFICATION", "label", "Identification"),
                Map.of("value", "OTHER", "label", "Other")
        );

        return ResponseEntity.ok(categories);
    }
}
