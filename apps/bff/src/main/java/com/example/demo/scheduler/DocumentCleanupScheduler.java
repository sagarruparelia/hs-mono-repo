package com.example.demo.scheduler;

import com.example.demo.service.DocumentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to clean up abandoned temporary document files
 * Runs every 15 minutes
 */
@Slf4j
@Component
public class DocumentCleanupScheduler {

    private final DocumentService documentService;

    public DocumentCleanupScheduler(DocumentService documentService) {
        this.documentService = documentService;
    }

    /**
     * Clean up temporary files older than 1 hour
     * Runs every 15 minutes (900000 ms)
     */
    @Scheduled(fixedRate = 900000, initialDelay = 60000) // Run every 15 min, start after 1 min
    public void cleanupAbandonedFiles() {
        log.info("Starting scheduled cleanup of abandoned temporary files");

        try {
            documentService.cleanupAbandonedTempFiles();
            log.info("Completed scheduled cleanup");
        } catch (Exception e) {
            log.error("Error during scheduled cleanup", e);
        }
    }
}
