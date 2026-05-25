package com.mikko_huttunen.scoreboards.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AuthProvider {

    public String requireAuth0UserId() {
        return getOptionalAuth0UserId()
                .orElseThrow(() -> new IllegalStateException("Not authenticated"));
    }

    public Optional<String> getOptionalAuth0UserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return Optional.ofNullable(jwt.getClaimAsString("sub"));
        }

        if (authentication instanceof JwtAuthenticationToken token) {
            Jwt jwt = token.getToken();
            return Optional.ofNullable(jwt.getClaimAsString("sub"));
        }

        return Optional.empty();
    }

    public Optional<String> getOptionalEmail() {
        Jwt jwt = getOptionalJwt().orElse(null);
        if (jwt == null) return Optional.empty();
        return Optional.ofNullable(jwt.getClaimAsString("email"));
    }

    public String requireEmail() {
        return getOptionalEmail().orElseThrow(() -> new IllegalStateException("Email missing from token"));
    }

    public Optional<String> getOptionalName() {
        Jwt jwt = getOptionalJwt().orElse(null);
        if (jwt == null) return Optional.empty();

        // Auth0 typically uses "name"; you can add fallback claims here if needed later.
        return Optional.ofNullable(jwt.getClaimAsString("name"));
    }

    public String requireName() {
        return getOptionalName().orElseThrow(() -> new IllegalStateException("Name missing from token"));
    }

    public Optional<String> getOptionalPicture() {
        Jwt jwt = getOptionalJwt().orElse(null);
        if (jwt == null) return Optional.empty();
        return Optional.ofNullable(jwt.getClaimAsString("picture"));
    }

    public String requirePicture() {
        return getOptionalPicture().orElseThrow(() -> new IllegalStateException("Picture missing from token"));
    }

    private Optional<Jwt> getOptionalJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return Optional.of(jwt);
        }

        if (authentication instanceof JwtAuthenticationToken token) {
            return Optional.of(token.getToken());
        }

        return Optional.empty();
    }

    public Optional<AuthProfile> getOptionalProfile() {
        Optional<String> auth0UserId = getOptionalAuth0UserId();
        if (auth0UserId.isEmpty()) return Optional.empty();

        return Optional.of(new AuthProfile(
                auth0UserId.get(),
                getOptionalEmail().orElse(null),
                getOptionalName().orElse(null),
                getOptionalPicture().orElse(null)
        ));
    }

    public record AuthProfile(String auth0UserId, String email, String name, String picture) { }
}