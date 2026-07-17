package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link Auth0ManagementService}.
 * The RestTemplate is replaced with a mock via reflection since it is created in the constructor.
 */
@ExtendWith(MockitoExtension.class)
class Auth0ManagementServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private Auth0ManagementService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new Auth0ManagementService();
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "auth0Domain", "example.auth0.com");
        ReflectionTestUtils.setField(service, "clientId", "client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "client-secret");
    }

    /** Pre-load a cached, non-expired access token so getAccessToken() skips the network call. */
    private void withCachedToken() {
        ReflectionTestUtils.setField(service, "accessToken", "cached-token");
        ReflectionTestUtils.setField(service, "tokenExpiry", Long.MAX_VALUE);
    }

    // ---------------------------------------------------------------------
    // getUser
    // ---------------------------------------------------------------------

    @Test
    void getUser_returnsBodyOnSuccess() {
        withCachedToken();
        ObjectNode body = objectMapper.createObjectNode();
        body.put("email", "a@b.com");
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(body));

        JsonNode result = service.getUser("auth0|1");

        assertEquals("a@b.com", result.get("email").asText());
    }

    @Test
    void getUser_throwsOnNonSuccess() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getUser("auth0|1"));
        assertEquals("Failed to fetch external user", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // updateUser
    // ---------------------------------------------------------------------

    @Test
    void updateUser_skipsWhenNameNull() {
        service.updateUser("auth0|1", null);

        verifyNoInteractions(restTemplate);
    }

    @Test
    void updateUser_patchesWhenNameProvided() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.PATCH), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));

        assertDoesNotThrow(() -> service.updateUser("auth0|1", "NewName"));
        verify(restTemplate).exchange(anyString(), eq(HttpMethod.PATCH), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void updateUser_throwsOnNonSuccess() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.PATCH), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.updateUser("auth0|1", "N"));
        assertEquals("Failed to update external user", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // deleteUser
    // ---------------------------------------------------------------------

    @Test
    void deleteUser_succeedsOnNoContent() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.DELETE), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.noContent().build());

        assertDoesNotThrow(() -> service.deleteUser("auth0|1"));
    }

    @Test
    void deleteUser_throwsWhenNotNoContent() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.DELETE), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("body"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.deleteUser("auth0|1"));
        assertEquals("Failed to delete external user", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // resendEmailVerification
    // ---------------------------------------------------------------------

    @Test
    void resendEmailVerification_succeeds() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));

        assertDoesNotThrow(() -> service.resendEmailVerification("auth0|1"));
    }

    @Test
    void resendEmailVerification_throwsOnFailure() {
        withCachedToken();
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.BAD_GATEWAY).build());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.resendEmailVerification("auth0|1"));
        assertEquals("Failed to resend verification email", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // getAccessToken (exercised through a public method)
    // ---------------------------------------------------------------------

    @Test
    void getAccessToken_fetchesTokenWhenNotCached() {
        // No cached token -> triggers token fetch via postForEntity
        ObjectNode tokenBody = objectMapper.createObjectNode();
        tokenBody.put("access_token", "fresh-token");
        tokenBody.put("expires_in", 3600);
        when(restTemplate.postForEntity(anyString(), any(), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(tokenBody));
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(objectMapper.createObjectNode()));

        assertDoesNotThrow(() -> service.getUser("auth0|1"));
        verify(restTemplate).postForEntity(anyString(), any(), eq(JsonNode.class));
    }

    @Test
    void getAccessToken_throwsWhenClientIdMissing() {
        ReflectionTestUtils.setField(service, "clientId", "");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getUser("auth0|1"));
        assertEquals("Auth0 client ID is not configured", ex.getMessage());
    }
}
