package com.mikko_huttunen.scoreboards.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthProvider}.
 */
class AuthProviderTest {

    private final AuthProvider authProvider = new AuthProvider();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("auth0|123")
                .claim("email", "a@b.com")
                .claim("name", "Alice")
                .claim("picture", "http://pic")
                .build();
    }

    private void authenticateWith(Jwt jwt) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(jwt);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // ---------------------------------------------------------------------
    // authenticated cases
    // ---------------------------------------------------------------------

    @Test
    void requireAuth0UserId_returnsSubject() {
        authenticateWith(jwt());

        assertEquals("auth0|123", authProvider.requireAuth0UserId());
    }

    @Test
    void getOptionalAuth0UserId_returnsSubject() {
        authenticateWith(jwt());

        assertEquals(Optional.of("auth0|123"), authProvider.getOptionalAuth0UserId());
    }

    @Test
    void getOptionalEmail_returnsEmail() {
        authenticateWith(jwt());

        assertEquals(Optional.of("a@b.com"), authProvider.getOptionalEmail());
    }

    @Test
    void requireEmail_returnsEmail() {
        authenticateWith(jwt());

        assertEquals("a@b.com", authProvider.requireEmail());
    }

    @Test
    void getOptionalName_returnsName() {
        authenticateWith(jwt());

        assertEquals(Optional.of("Alice"), authProvider.getOptionalName());
    }

    @Test
    void requireName_returnsName() {
        authenticateWith(jwt());

        assertEquals("Alice", authProvider.requireName());
    }

    @Test
    void getOptionalPicture_returnsPicture() {
        authenticateWith(jwt());

        assertEquals(Optional.of("http://pic"), authProvider.getOptionalPicture());
    }

    @Test
    void requirePicture_returnsPicture() {
        authenticateWith(jwt());

        assertEquals("http://pic", authProvider.requirePicture());
    }

    @Test
    void getOptionalProfile_returnsFullProfile() {
        authenticateWith(jwt());

        Optional<AuthProvider.AuthProfile> profile = authProvider.getOptionalProfile();

        assertTrue(profile.isPresent());
        assertEquals("auth0|123", profile.get().auth0UserId());
        assertEquals("a@b.com", profile.get().email());
        assertEquals("Alice", profile.get().name());
        assertEquals("http://pic", profile.get().picture());
    }

    // ---------------------------------------------------------------------
    // unauthenticated cases
    // ---------------------------------------------------------------------

    @Test
    void requireAuth0UserId_throwsWhenNotAuthenticated() {
        SecurityContextHolder.clearContext();

        assertThrows(IllegalStateException.class, () -> authProvider.requireAuth0UserId());
    }

    @Test
    void getOptionalAuth0UserId_emptyWhenNoAuthentication() {
        SecurityContextHolder.clearContext();

        assertTrue(authProvider.getOptionalAuth0UserId().isEmpty());
    }

    @Test
    void getOptionalEmail_emptyWhenNoAuthentication() {
        SecurityContextHolder.clearContext();

        assertTrue(authProvider.getOptionalEmail().isEmpty());
    }

    @Test
    void requireEmail_throwsWhenNoAuthentication() {
        SecurityContextHolder.clearContext();

        assertThrows(IllegalStateException.class, () -> authProvider.requireEmail());
    }

    @Test
    void getOptionalProfile_emptyWhenNotAuthenticated() {
        SecurityContextHolder.clearContext();

        assertTrue(authProvider.getOptionalProfile().isEmpty());
    }
}
