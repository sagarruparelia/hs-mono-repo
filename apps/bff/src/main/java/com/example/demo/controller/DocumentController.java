package com.example.demo.controller;

import com.example.demo.exception.UnauthorizedException;
import com.example.demo.model.*;
import com.example.demo.service.DocumentService;
import com.example.demo.service.SessionService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * REST API for document management (Reactive)
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
     */
    @PostMapping("/upload/initiate")
    public Mono<ResponseEntity<DocumentUploadResponse>> initiateUpload(
            ServerHttpRequest request,
            @Valid @RequestBody DocumentUploadRequest uploadRequest
    ) {
        log.info("Initiating document upload for {} files", uploadRequest.getFiles().size());

        return sessionService.getSessionFromRequest(request)
                .switchIfEmpty(Mono.error(new UnauthorizedException("No valid session")))
                .flatMap(session -> documentService.initiateUpload(uploadRequest, session)
                        .map(ResponseEntity::ok));
    }

    /**
     * Finalize document upload
     */
    @PostMapping("/upload/finalize")
    public Mono<ResponseEntity<List<UserDocument>>> finalizeUpload(
            ServerHttpRequest request,
            @Valid @RequestBody DocumentFinalizeRequest finalizeRequest
    ) {
        log.info("Finalizing upload for {} documents", finalizeRequest.getTempDocumentIds().size());

        return sessionService.getSessionFromRequest(request)
                .switchIfEmpty(Mono.error(new UnauthorizedException("No valid session")))
                .flatMap(session -> documentService.finalizeUpload(finalizeRequest, session)
                        .map(ResponseEntity::ok));
    }

    /**
     * Search/list documents with filters
     */
    @PostMapping("/search")
    public Mono<ResponseEntity<Page<UserDocument>>> searchDocuments(
            ServerHttpRequest request,
            @Valid @RequestBody DocumentSearchRequest searchRequest
    ) {
        log.info("Searching documents for owner: {}={}",
                searchRequest.getOwnerIdType(), searchRequest.getOwnerIdValue());

        return sessionService.getSessionFromRequest(request)
                .switchIfEmpty(Mono.error(new UnauthorizedException("No valid session")))
                .flatMap(session -> documentService.searchDocuments(searchRequest, session)
                        .map(ResponseEntity::ok));
    }

    /**
     * Get download URL for a document
     */
    @GetMapping("/{documentId}/download")
    public Mono<ResponseEntity<Map<String, Object>>> getDownloadUrl(
            ServerHttpRequest request,
            @PathVariable String documentId
    ) {
        log.info("Generating download URL for document: {}", documentId);

        return sessionService.getSessionFromRequest(request)
                .switchIfEmpty(Mono.error(new UnauthorizedException("No valid session")))
                .flatMap(session -> documentService.getDownloadUrl(documentId, session)
                        .map(downloadUrl -> ResponseEntity.ok(Map.of(
                                "downloadUrl", downloadUrl,
                                "expiresIn", 15 * 60 // 15 minutes
                        ))));
    }

    /**
     * Delete a document (soft delete)
     */
    @DeleteMapping("/{documentId}")
    public Mono<ResponseEntity<Void>> deleteDocument(
            ServerHttpRequest request,
            @PathVariable String documentId
    ) {
        log.info("Deleting document: {}", documentId);

        return sessionService.getSessionFromRequest(request)
                .switchIfEmpty(Mono.error(new UnauthorizedException("No valid session")))
                .flatMap(session -> documentService.deleteDocument(documentId, session)
                        .thenReturn(ResponseEntity.noContent().<Void>build()));
    }

    /**
     * Get document categories
     */
    @GetMapping("/categories")
    public Mono<ResponseEntity<List<Map<String, String>>>> getCategories() {
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

        return Mono.just(ResponseEntity.ok(categories));
    }
}
