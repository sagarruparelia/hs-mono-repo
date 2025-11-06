package com.example.demo.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

/**
 * Custom Health Indicator for AWS S3
 * Checks bucket accessibility and provides detailed status information
 */
@Slf4j
@Component
public class S3HealthIndicator implements HealthIndicator {

    private final S3Client s3Client;
    private final String bucketName;
    private final String region;

    public S3HealthIndicator(
            S3Client s3Client,
            @Value("${aws.s3.documents.bucket}") String bucketName,
            @Value("${aws.s3.documents.region:us-east-1}") String region
    ) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.region = region;
    }

    @Override
    public Health health() {
        try {
            // Check if bucket is accessible
            HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                    .bucket(bucketName)
                    .build();

            s3Client.headBucket(headBucketRequest);

            log.debug("S3 health check passed - Bucket: {}, Region: {}", bucketName, region);

            return Health.up()
                    .withDetail("bucket", bucketName)
                    .withDetail("region", region)
                    .withDetail("status", "Accessible")
                    .build();

        } catch (Exception e) {
            log.error("S3 health check failed - Bucket: {}", bucketName, e);
            return Health.down()
                    .withDetail("bucket", bucketName)
                    .withDetail("region", region)
                    .withDetail("error", e.getClass().getSimpleName())
                    .withDetail("message", e.getMessage())
                    .build();
        }
    }
}
