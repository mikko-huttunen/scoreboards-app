package com.mikko_huttunen.scoreboards.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link S3Service}.
 */
@ExtendWith(MockitoExtension.class)
class S3ServiceTest {

    private static final String BUCKET = "test-bucket";

    @Mock
    private S3Client s3Client;
    @Mock
    private S3Presigner s3Presigner;

    private S3Service s3Service;

    @BeforeEach
    void setUp() {
        s3Service = new S3Service(s3Client, s3Presigner);
        // bucketName is @Value-injected, so it must be set manually in a plain unit test
        ReflectionTestUtils.setField(s3Service, "bucketName", BUCKET);
    }

    private MultipartFile imageFile(String contentType) {
        return new MockMultipartFile("file", "pic.png", contentType, new byte[]{1, 2, 3});
    }

    private S3Exception s3Exception(String message) {
        return (S3Exception) S3Exception.builder()
                .awsErrorDetails(AwsErrorDetails.builder().errorMessage(message).build())
                .message(message)
                .build();
    }

    // ---------------------------------------------------------------------
    // uploadFile
    // ---------------------------------------------------------------------

    @Test
    void uploadFile_putsObjectAndReturnsS3Reference() throws IOException {
        String result = s3Service.uploadFile("avatars/user-1/pic.png", imageFile("image/png"));

        assertEquals("s3://" + BUCKET + "/avatars/user-1/pic.png", result);
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void uploadFile_buildsRequestWithEncryptionAndCacheHeaders() throws IOException {
        MultipartFile file = imageFile("image/jpeg");

        s3Service.uploadFile("avatars/user-1/pic.jpg", file);

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));

        PutObjectRequest request = captor.getValue();
        assertEquals(BUCKET, request.bucket());
        assertEquals("avatars/user-1/pic.jpg", request.key());
        assertEquals("image/jpeg", request.contentType());
        assertEquals(file.getSize(), request.contentLength());
        assertEquals(ServerSideEncryption.AES256, request.serverSideEncryption());
        assertEquals("max-age=31536000", request.cacheControl());
    }

    @ParameterizedTest
    @ValueSource(strings = {"image/jpeg", "image/jpg", "image/png", "image/gif"})
    void uploadFile_acceptsAllowedImageContentTypes(String contentType) throws IOException {
        String result = s3Service.uploadFile("avatars/user-1/pic", imageFile(contentType));

        assertNotNull(result);
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"application/pdf", "text/plain", "image/svg+xml", "image/webp", "IMAGE/PNG"})
    void uploadFile_rejectsDisallowedContentTypes(String contentType) {
        MultipartFile file = imageFile(contentType);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.uploadFile("avatars/user-1/pic", file));
        assertEquals("File must be an image (JPEG/JPG/PNG/GIF)", ex.getMessage());
        verifyNoInteractions(s3Client);
    }

    @Test
    void uploadFile_rejectsNullContentType() {
        MultipartFile file = new MockMultipartFile("file", "pic.png", null, new byte[]{1});

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.uploadFile("avatars/user-1/pic.png", file));
        assertEquals("File must be an image (JPEG/JPG/PNG/GIF)", ex.getMessage());
        verifyNoInteractions(s3Client);
    }

    @Test
    void uploadFile_rejectsNullFile() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.uploadFile("avatars/user-1/pic.png", null));
        assertEquals("File is empty", ex.getMessage());
        verifyNoInteractions(s3Client);
    }

    @Test
    void uploadFile_rejectsEmptyFile() {
        MultipartFile file = new MockMultipartFile("file", "pic.png", "image/png", new byte[0]);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.uploadFile("avatars/user-1/pic.png", file));
        assertEquals("File is empty", ex.getMessage());
        verifyNoInteractions(s3Client);
    }

    @Test
    void uploadFile_wrapsS3Exception() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(s3Exception("Access denied"));

        MultipartFile file = imageFile("image/png");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> s3Service.uploadFile("avatars/user-1/pic.png", file));
        assertEquals("Failed to upload file: Access denied", ex.getMessage());
        assertInstanceOf(S3Exception.class, ex.getCause());
    }

    // ---------------------------------------------------------------------
    // deleteFile
    // ---------------------------------------------------------------------

    @Test
    void deleteFile_deletesObjectForS3Reference() {
        s3Service.deleteFile("s3://" + BUCKET + "/avatars/user-1/pic.png");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(captor.capture());

        assertEquals(BUCKET, captor.getValue().bucket());
        assertEquals("avatars/user-1/pic.png", captor.getValue().key());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "https://external.example.com/avatar.png", "avatar.png"})
    void deleteFile_ignoresNonS3References(String storedValue) {
        s3Service.deleteFile(storedValue);

        verifyNoInteractions(s3Client);
    }

    @Test
    void deleteFile_ignoresNull() {
        s3Service.deleteFile(null);

        verifyNoInteractions(s3Client);
    }

    @Test
    void deleteFile_throwsForReferenceFromAnotherBucket() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.deleteFile("s3://other-bucket/avatars/user-1/pic.png"));
        assertEquals("Stored S3 reference does not belong to this bucket", ex.getMessage());
        verifyNoInteractions(s3Client);
    }

    @Test
    void deleteFile_wrapsS3Exception() {
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .thenThrow(s3Exception("No such key"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> s3Service.deleteFile("s3://" + BUCKET + "/avatars/user-1/pic.png"));
        assertEquals("Failed to delete old S3 object: No such key", ex.getMessage());
        assertInstanceOf(S3Exception.class, ex.getCause());
    }

    // ---------------------------------------------------------------------
    // resolveUrl
    // ---------------------------------------------------------------------

    @Test
    void resolveUrl_returnsPresignedUrlForS3Reference() throws Exception {
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://test-bucket.s3.amazonaws.com/pic.png?sig=abc").toURL());
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        String result = s3Service.resolveUrl("s3://" + BUCKET + "/avatars/user-1/pic.png");

        assertEquals("https://test-bucket.s3.amazonaws.com/pic.png?sig=abc", result);
    }

    @Test
    void resolveUrl_presignsCorrectKeyWithFifteenMinuteExpiry() throws Exception {
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://signed").toURL());
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        s3Service.resolveUrl("s3://" + BUCKET + "/avatars/user-1/pic.png");

        ArgumentCaptor<GetObjectPresignRequest> captor =
                ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(s3Presigner).presignGetObject(captor.capture());

        GetObjectPresignRequest request = captor.getValue();
        assertEquals(Duration.ofMinutes(15), request.signatureDuration());
        assertEquals(BUCKET, request.getObjectRequest().bucket());
        assertEquals("avatars/user-1/pic.png", request.getObjectRequest().key());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "https://external.example.com/avatar.png", "avatar.png"})
    void resolveUrl_passesThroughNonS3Values(String storedValue) {
        assertEquals(storedValue, s3Service.resolveUrl(storedValue));

        verifyNoInteractions(s3Presigner);
    }

    @Test
    void resolveUrl_returnsNullForNull() {
        assertNull(s3Service.resolveUrl(null));

        verifyNoInteractions(s3Presigner);
    }

    @Test
    void resolveUrl_throwsForReferenceFromAnotherBucket() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> s3Service.resolveUrl("s3://other-bucket/avatars/user-1/pic.png"));
        assertEquals("Stored S3 reference does not belong to this bucket", ex.getMessage());
        verifyNoInteractions(s3Presigner);
    }
}
