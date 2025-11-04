package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Request for searching documents
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentSearchRequest {

    /**
     * Search by owner (whose documents to fetch)
     */
    private String ownerIdType;
    private String ownerIdValue;

    /**
     * Search by uploader
     */
    private String uploadedByIdType;
    private String uploadedByIdValue;

    /**
     * Filter by category
     */
    private List<UserDocument.DocumentCategory> categories;

    /**
     * Filter by date range
     */
    private Instant uploadedAfter;
    private Instant uploadedBefore;

    /**
     * Search in filename, description, tags, extracted text
     */
    private String searchQuery;

    /**
     * Filter by tags
     */
    private List<String> tags;

    /**
     * Include sensitive documents (requires ROI access)
     */
    @Builder.Default
    private Boolean includeSensitive = false;

    /**
     * Pagination
     */
    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;

    /**
     * Sort field and direction
     */
    @Builder.Default
    private String sortBy = "uploadedAt";

    @Builder.Default
    private String sortDirection = "DESC"; // ASC or DESC
}
