package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to finalize document uploads
 * Called when user clicks "Upload" after selecting category
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentFinalizeRequest {

    /**
     * Temporary document IDs from upload response
     */
    private List<String> tempDocumentIds;

    /**
     * Document category selected by user
     */
    private UserDocument.DocumentCategory category;

    /**
     * Optional description
     */
    private String description;

    /**
     * Optional tags
     */
    private List<String> tags;
}
