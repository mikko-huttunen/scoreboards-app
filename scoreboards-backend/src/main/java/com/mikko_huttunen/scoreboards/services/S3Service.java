package com.mikko_huttunen.scoreboards.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Set;

@Service
public class S3Service {

    private static final Logger logger = LoggerFactory.getLogger(S3Service.class);

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif"
    );

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L; // 5MB

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    /**
     * Uploads a file to S3 and returns a stored reference.
     */
    public String uploadFile(String keyName, MultipartFile file) throws IOException {
        logger.info("Uploading file to S3: {}", keyName);
        validateImage(file);

        try (InputStream inputStream = file.getInputStream()) {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .cacheControl("max-age=31536000")
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, file.getSize()));

            logger.info("File uploaded to S3: {}", keyName);
            return toS3Url(keyName);
        } catch (S3Exception e) {
            throw new RuntimeException("Failed to upload file: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    /**
     * Deletes a stored S3 file.
     */
    public void deleteFile(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) return;
        if (!storedValue.startsWith("s3://")) return;

        logger.info("Deleting S3 file: {}", storedValue);

        try {
            String key = extractKeyFromS3Url(storedValue);
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            logger.info("S3 file deleted: {}", key);
        } catch (S3Exception e) {
            throw new RuntimeException("Failed to delete old S3 object: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    /**
     * Resolves a stored reference into a short-lived, pre-signed HTTPS URL.
     */
    public String resolveUrl(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return storedValue;
        }

        if (!storedValue.startsWith("s3://")) {
            return storedValue;
        }

        String key = extractKeyFromS3Url(storedValue);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File must be 5MB or under");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File must be an image (JPEG/JPG/PNG/GIF)");
        }
    }

    private String toS3Url(String keyName) {
        return "s3://" + bucketName + "/" + keyName;
    }

    private String extractKeyFromS3Url(String s3Url) {
        String prefix = "s3://" + bucketName + "/";
        if (!s3Url.startsWith(prefix)) {
            throw new IllegalArgumentException("Stored S3 reference does not belong to this bucket");
        }
        return s3Url.substring(prefix.length());
    }
}