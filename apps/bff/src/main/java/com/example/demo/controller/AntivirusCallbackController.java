package com.example.demo.controller;

import com.example.demo.model.UserDocument;
import com.example.demo.repository.DocumentRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Instant;

/**
 * Callback endpoint for Lambda AV scanner
 * Receives scan results and updates document status (Reactive)
 */
@Slf4j
@RestController
@RequestMapping("/api/documents/av-callback")
public class AntivirusCallbackController {

    private final DocumentRepository documentRepository;

    public AntivirusCallbackController(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @Data
    public static class AVCallbackRequest {
        private String tempS3Key;
        private String avStatus; // "clean", "infected", "error"
        private String virusName;
        private String scannedAt;
    }

    /**
     * Receive AV scan results from Lambda
     *
     * POST /api/documents/av-callback
     * {
     *   "tempS3Key": "temp/session-xyz/1234-file.pdf",
     *   "avStatus": "clean",
     *   "scannedAt": "2024-01-01T12:00:00Z"
     * }
     */
    @PostMapping
    public Mono<ResponseEntity<Void>> handleAVCallback(@RequestBody AVCallbackRequest request) {
        log.info("Received AV callback for: {}, status: {}", request.getTempS3Key(), request.getAvStatus());

        // Find document by temp S3 key
        return documentRepository.findByTempS3Key(request.getTempS3Key())
                .flatMap(document -> {
                    // Update AV status based on scan result
                    switch (request.getAvStatus().toLowerCase()) {
                        case "clean":
                            document.setAvStatus(UserDocument.AntivirusStatus.CLEAN);
                            document.setAvScannedAt(Instant.now());
                            log.info("✅ Document marked CLEAN: {}", document.getDocumentId());
                            break;

                        case "infected":
                            document.setAvStatus(UserDocument.AntivirusStatus.INFECTED);
                            document.setVirusName(request.getVirusName());
                            document.setAvScannedAt(Instant.now());
                            document.setStatus(UserDocument.DocumentStatus.DELETED); // Soft delete infected files
                            log.error("🚨 Document marked INFECTED: {} - Virus: {}",
                                    document.getDocumentId(), request.getVirusName());
                            break;

                        case "error":
                            document.setAvStatus(UserDocument.AntivirusStatus.SCAN_ERROR);
                            document.setAvScannedAt(Instant.now());
                            log.error("⚠️ AV scan ERROR for document: {}", document.getDocumentId());
                            break;

                        default:
                            log.warn("Unknown AV status: {}", request.getAvStatus());
                            return Mono.just(ResponseEntity.badRequest().<Void>build());
                    }

                    return documentRepository.save(document)
                            .thenReturn(ResponseEntity.ok().<Void>build());
                })
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Document not found for temp S3 key: {}", request.getTempS3Key());
                    return Mono.just(ResponseEntity.notFound().<Void>build());
                }));
    }
}
