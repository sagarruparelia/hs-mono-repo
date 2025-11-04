package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * S3 Service for managing document uploads and downloads
 * Generates presigned URLs for direct browser-to-S3 operations
 */
@Slf4j
@Service
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final Duration uploadUrlExpiration;
    private final Duration downloadUrlExpiration;

    public S3Service(
            @Value("${aws.s3.documents.bucket}") String bucketName,
            @Value("${aws.s3.documents.region:us-east-1}") String region,
            @Value("${aws.s3.documents.upload-url-expiration-minutes:15}") int uploadExpirationMinutes,
            @Value("${aws.s3.documents.download-url-expiration-minutes:15}") int downloadExpirationMinutes,
            @Value("${aws.accessKeyId:}") String accessKeyId,
            @Value("${aws.secretAccessKey:}") String secretAccessKey
    ) {
        this.bucketName = bucketName;
        this.uploadUrlExpiration = Duration.ofMinutes(uploadExpirationMinutes);
        this.downloadUrlExpiration = Duration.ofMinutes(downloadExpirationMinutes);

        Region awsRegion = Region.of(region);

        // Build S3 client
        if (accessKeyId != null && !accessKeyId.isEmpty()) {
            // Use explicit credentials (for local development)
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
            this.s3Client = S3Client.builder()
                    .region(awsRegion)
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
            this.s3Presigner = S3Presigner.builder()
                    .region(awsRegion)
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
        } else {
            // Use IAM role (for production - EC2/ECS/Lambda)
            this.s3Client = S3Client.builder()
                    .region(awsRegion)
                    .build();
            this.s3Presigner = S3Presigner.builder()
                    .region(awsRegion)
                    .build();
        }
    }

    /**
     * Generate presigned URL for uploading a file to S3
     * Frontend will use this URL to PUT the file directly to S3
     *
     * @param s3Key The S3 object key (path)
     * @param contentType MIME type of the file
     * @return Presigned URL valid for 15 minutes
     */
    public String generatePresignedUploadUrl(String s3Key, String contentType) {
        log.debug("Generating presigned upload URL for key: {}", s3Key);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(uploadUrlExpiration)
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

        log.info("Generated presigned upload URL for key: {} (expires in {} minutes)",
                s3Key, uploadUrlExpiration.toMinutes());

        return presignedRequest.url().toString();
    }

    /**
     * Generate presigned URL for downloading a file from S3
     * Frontend will use this URL to GET the file directly from S3
     *
     * @param s3Key The S3 object key (path)
     * @return Presigned URL valid for 15 minutes
     */
    public String generatePresignedDownloadUrl(String s3Key) {
        log.debug("Generating presigned download URL for key: {}", s3Key);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(downloadUrlExpiration)
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);

        log.info("Generated presigned download URL for key: {} (expires in {} minutes)",
                s3Key, downloadUrlExpiration.toMinutes());

        return presignedRequest.url().toString();
    }

    /**
     * Move file from temporary location to permanent location
     *
     * @param tempKey Temporary S3 key
     * @param permanentKey Permanent S3 key
     */
    public void moveFile(String tempKey, String permanentKey) {
        log.info("Moving file from {} to {}", tempKey, permanentKey);

        try {
            // Copy object to new location
            CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .sourceBucket(bucketName)
                    .sourceKey(tempKey)
                    .destinationBucket(bucketName)
                    .destinationKey(permanentKey)
                    .build();

            s3Client.copyObject(copyRequest);

            // Delete original
            deleteFile(tempKey);

            log.info("Successfully moved file from {} to {}", tempKey, permanentKey);

        } catch (Exception e) {
            log.error("Failed to move file from {} to {}", tempKey, permanentKey, e);
            throw new RuntimeException("Failed to move file in S3", e);
        }
    }

    /**
     * Delete a file from S3
     *
     * @param s3Key The S3 object key to delete
     */
    public void deleteFile(String s3Key) {
        log.info("Deleting file: {}", s3Key);

        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.deleteObject(deleteRequest);

            log.info("Successfully deleted file: {}", s3Key);

        } catch (Exception e) {
            log.error("Failed to delete file: {}", s3Key, e);
            throw new RuntimeException("Failed to delete file from S3", e);
        }
    }

    /**
     * Delete multiple files from S3
     *
     * @param s3Keys List of S3 object keys to delete
     */
    public void deleteFiles(List<String> s3Keys) {
        if (s3Keys == null || s3Keys.isEmpty()) {
            return;
        }

        log.info("Deleting {} files", s3Keys.size());

        try {
            List<ObjectIdentifier> objectIdentifiers = s3Keys.stream()
                    .map(key -> ObjectIdentifier.builder().key(key).build())
                    .toList();

            Delete delete = Delete.builder()
                    .objects(objectIdentifiers)
                    .build();

            DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(delete)
                    .build();

            s3Client.deleteObjects(deleteRequest);

            log.info("Successfully deleted {} files", s3Keys.size());

        } catch (Exception e) {
            log.error("Failed to delete files", e);
            throw new RuntimeException("Failed to delete files from S3", e);
        }
    }

    /**
     * List all files with a specific prefix
     *
     * @param prefix S3 key prefix
     * @return List of S3 object keys
     */
    public List<String> listFiles(String prefix) {
        log.debug("Listing files with prefix: {}", prefix);

        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

            List<String> keys = listResponse.contents().stream()
                    .map(S3Object::key)
                    .toList();

            log.info("Found {} files with prefix: {}", keys.size(), prefix);

            return keys;

        } catch (Exception e) {
            log.error("Failed to list files with prefix: {}", prefix, e);
            throw new RuntimeException("Failed to list files from S3", e);
        }
    }

    /**
     * Check if a file exists in S3
     *
     * @param s3Key The S3 object key
     * @return true if exists, false otherwise
     */
    public boolean fileExists(String s3Key) {
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.headObject(headRequest);
            return true;

        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.error("Failed to check if file exists: {}", s3Key, e);
            throw new RuntimeException("Failed to check file existence in S3", e);
        }
    }

    /**
     * Generate temporary S3 key for upload
     * Format: temp/{sessionId}/{timestamp}-{sanitizedFilename}
     */
    public String generateTempS3Key(String sessionId, String filename) {
        String sanitized = sanitizeFilename(filename);
        long timestamp = Instant.now().toEpochMilli();
        return String.format("temp/%s/%d-%s", sessionId, timestamp, sanitized);
    }

    /**
     * Generate permanent S3 key for document
     * Format: documents/{ownerIdType}/{ownerIdValue}/{year}/{month}/{documentId}-{sanitizedFilename}
     */
    public String generatePermanentS3Key(
            String ownerIdType,
            String ownerIdValue,
            String documentId,
            String filename
    ) {
        Instant now = Instant.now();
        int year = now.atZone(java.time.ZoneId.systemDefault()).getYear();
        int month = now.atZone(java.time.ZoneId.systemDefault()).getMonthValue();
        String sanitized = sanitizeFilename(filename);

        return String.format("documents/%s/%s/%d/%02d/%s-%s",
                ownerIdType, ownerIdValue, year, month, documentId, sanitized);
    }

    /**
     * Sanitize filename to prevent path traversal and special characters
     */
    public String sanitizeFilename(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "unknown";
        }

        // Remove path separators and special characters
        String sanitized = filename.replaceAll("[^a-zA-Z0-9._-]", "_");

        // Limit length
        if (sanitized.length() > 200) {
            String extension = "";
            int dotIndex = sanitized.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = sanitized.substring(dotIndex);
                sanitized = sanitized.substring(0, 200 - extension.length()) + extension;
            } else {
                sanitized = sanitized.substring(0, 200);
            }
        }

        return sanitized;
    }

    public String getBucketName() {
        return bucketName;
    }
}
