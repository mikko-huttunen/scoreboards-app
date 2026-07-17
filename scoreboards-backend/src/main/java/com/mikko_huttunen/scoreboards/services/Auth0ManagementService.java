package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for interacting with Auth0 Management API.
 */
@Service
public class Auth0ManagementService {

    private static final Logger logger = LoggerFactory.getLogger(Auth0ManagementService.class);

    @Value("${auth0.domain}")
    private String auth0Domain;

    @Value("${auth0.clientId}")
    private String clientId;

    @Value("${auth0.clientSecret}")
    private String clientSecret;

    private final RestTemplate restTemplate;
    private String accessToken;
    private long tokenExpiry;

    public Auth0ManagementService() {
        this.restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());
    }
    
    /**
     * Get or refresh the Auth0 Management API access token.
     * @return The access token
     */
    private String getAccessToken() {
        if (accessToken != null && System.currentTimeMillis() < tokenExpiry) {
            return accessToken;
        }

        logger.info("Fetching Auth0 Management API access token for domain: {}", auth0Domain);

        // Validate configuration
        if (clientId == null || clientId.trim().isEmpty()) {
            logger.error("Auth0 client ID is not configured");
            throw new RuntimeException("Auth0 client ID is not configured");
        }
        if (clientSecret == null || clientSecret.trim().isEmpty()) {
            logger.error("Auth0 client secret is not configured");
            throw new RuntimeException("Auth0 client secret is not configured");
        }

        String tokenUrl = "https://" + auth0Domain + "/oauth/token";

        // Auth0 Management API expects form-urlencoded data, not JSON
        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.add("client_id", clientId.trim());
        requestBody.add("client_secret", clientSecret.trim());
        requestBody.add("audience", "https://" + auth0Domain + "/api/v2/");
        requestBody.add("grant_type", "client_credentials");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(requestBody, headers);

        logger.debug("Requesting token from: {}", tokenUrl);
        ResponseEntity<JsonNode> responseEntity = restTemplate.postForEntity(tokenUrl, request, JsonNode.class);

        if (responseEntity.getStatusCode() == HttpStatus.OK) {
            JsonNode response = responseEntity.getBody();

            if (response != null && response.has("access_token")) {
                accessToken = response.get("access_token").asText();
                int expiresIn = response.get("expires_in").asInt();
                tokenExpiry = System.currentTimeMillis() + (expiresIn) * 1000L;
                logger.info("Successfully obtained Auth0 Management API access token (expires in {} seconds)", expiresIn);
                return accessToken;
            }
        }

        throw new RuntimeException("Failed to get access token");
    }
    
    /**
     * Update a user in Auth0.
     * @param auth0UserId The Auth0 user ID
     * @param name The new name
     */
    public void updateUser(String auth0UserId, String name) {
        logger.info("Updating Auth0 user: {}", auth0UserId);

        if (name == null) {
            logger.info("No user fields to update for Auth0 user {} (name was null). Skipping Auth0 PATCH.", auth0UserId);
            return;
        }

        String updateUrl = UriComponentsBuilder.fromUriString("https://" + auth0Domain + "/api/v2/users/{userId}")
                .buildAndExpand(auth0UserId)
                .toUriString();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", name);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(getAccessToken());
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(updateUrl, HttpMethod.PATCH, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to update external user");
        }

        logger.info("Successfully updated Auth0 user: {}", auth0UserId);
    }
    
    /**
     * Delete a user from Auth0.
     * @param auth0UserId The Auth0 user ID
     * @throws RuntimeException if the deletion fails
     */
    public void deleteUser(String auth0UserId) {
        logger.info("Deleting Auth0 user: {}", auth0UserId);

        // Auth0 user IDs contain '|' which will be properly encoded as '%7C'
        String deleteUrl = UriComponentsBuilder.fromUriString("https://" + auth0Domain + "/api/v2/users/{userId}")
                .buildAndExpand(auth0UserId)
                .toUriString();

        String token = getAccessToken();
        if (token == null || token.trim().isEmpty()) {
            logger.error("Access token is null or empty");
            throw new RuntimeException("Access token is null or empty");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, request, String.class);

        if (response.getStatusCode() != HttpStatus.NO_CONTENT) {
            throw new RuntimeException("Failed to delete external user");
        }

        if (response.getStatusCode().is2xxSuccessful()) {
            logger.info("Successfully deleted Auth0 user: {}", auth0UserId);
        } else {
            logger.warn("Unexpected status code when deleting Auth0 user {}: {}", auth0UserId, response.getStatusCode());
        }
    }

    /**
     * Send a new email verification email through Auth0.
     * @param auth0UserId The Auth0 user ID
     */
    public void resendEmailVerification(String auth0UserId) {
        logger.info("Sending email verification for Auth0 user: {}", auth0UserId);

        String verificationUrl = "https://" + auth0Domain + "/api/v2/jobs/verification-email";

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("user_id", auth0UserId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(getAccessToken());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(
                verificationUrl,
                HttpMethod.POST,
                request,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            logger.error("Failed to create Auth0 email verification job for user {}. Status: {}",
                    auth0UserId, response.getStatusCode());
            throw new RuntimeException("Failed to resend verification email");
        }

        logger.info("Successfully created Auth0 email verification job for user: {}", auth0UserId);
    }
    
    /**
     * Get user information from Auth0.
     * @param auth0UserId The Auth0 user ID
     * @return User information as JsonNode
     */
    public JsonNode getUser(String auth0UserId) {
        logger.info("Fetching Auth0 user: {}", auth0UserId);

        String getUserUrl = UriComponentsBuilder.fromUriString("https://" + auth0Domain + "/api/v2/users/{userId}")
                .buildAndExpand(auth0UserId)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, JsonNode.class);

        if (!responseEntity.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to fetch external user");
        }

        JsonNode response = responseEntity.getBody();

        logger.info("Successfully fetched Auth0 user: {}", auth0UserId);
        return response;
    }
}

