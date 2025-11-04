package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing presigned URLs for upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadResponse {

    private List<UploadInfo> uploads;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadInfo {
        private String tempDocumentId; // Temporary document ID
        private String fileName;
        private String presignedUrl; // S3 presigned URL for PUT
        private String s3Key; // Temp S3 key
        private Long expiresIn; // Seconds until URL expires (900 = 15 min)
    }
}
