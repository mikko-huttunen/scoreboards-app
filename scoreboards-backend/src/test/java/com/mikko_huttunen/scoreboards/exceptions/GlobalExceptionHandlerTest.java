package com.mikko_huttunen.scoreboards.exceptions;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.WebRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link GlobalExceptionHandler}.
 */
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private WebRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = mock(WebRequest.class);
        when(request.getDescription(false)).thenReturn("uri=/api/test");
    }

    @Test
    void handleDataIntegrityViolationException_returnsBadRequest() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("boom");

        ResponseEntity<ErrorResponse> response =
                handler.handleDataIntegrityViolationException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("VALIDATION_ERROR", body.getError());
        assertEquals("Database validation failed.", body.getMessage());
        assertEquals("/api/test", body.getPath());
        assertEquals(HttpStatus.BAD_REQUEST.value(), body.getStatus());
    }

    @Test
    void handleIllegalArgumentException_returnsBadRequestWithMessage() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input");

        ResponseEntity<ErrorResponse> response =
                handler.handleIllegalArgumentException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("BAD_REQUEST", body.getError());
        assertEquals("Invalid input", body.getMessage());
        assertEquals("/api/test", body.getPath());
    }

    @Test
    void handleGlobalException_returnsInternalServerError() {
        Exception ex = new RuntimeException("Unexpected");

        ResponseEntity<ErrorResponse> response = handler.handleGlobalException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("INTERNAL_SERVER_ERROR", body.getError());
        assertEquals("Unexpected", body.getMessage());
    }
}
