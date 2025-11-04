package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to get presigned URLs for document upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadRequest {

    /**
     * Files to upload (max 5)
     */
    private List<FileUploadInfo> files;

    /**
     * Document owner (whose document this is)
     */
    private String ownerIdType; // HSID, EID, etc.
    private String ownerIdValue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileUploadInfo {
        private String fileName;
        private String contentType;
        private Long fileSize; // Bytes
    }
}
