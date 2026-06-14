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
import org.springframework.web.client.HttpClientErrorException;
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
        
        try {
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
            JsonNode response = responseEntity.getBody();
            
            if (response != null && response.has("access_token")) {
                accessToken = response.get("access_token").asText();
                int expiresIn = response.has("expires_in") ? response.get("expires_in").asInt() : 86400;
                tokenExpiry = System.currentTimeMillis() + (expiresIn - 60) * 1000L; // Refresh 60 seconds early
                logger.info("Successfully obtained Auth0 Management API access token (expires in {} seconds)", expiresIn);
                return accessToken;
            } else {
                logger.error("Failed to obtain Auth0 Management API access token: invalid response - {}", response);
                throw new RuntimeException("Failed to obtain Auth0 Management API access token: invalid response");
            }
        } catch (HttpClientErrorException e) {
            logger.error("HTTP error obtaining Auth0 Management API access token: {} - Response body: {}", 
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to obtain Auth0 Management API access token: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("Error obtaining Auth0 Management API access token: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to obtain Auth0 Management API access token", e);
        }
    }
    
    /**
     * Update a user in Auth0.
     * @param auth0UserId The Auth0 user ID
     * @param name The new name
     */
    public void updateUser(String auth0UserId, String name) {
        try {
            logger.info("Updating Auth0 user: {}", auth0UserId);

            if (name == null) {
                logger.info("No user fields to update for Auth0 user {} (name was null). Skipping Auth0 PATCH.", auth0UserId);
                return;
            }
            
            // UriComponentsBuilder will automatically URL-encode the path variable
            String updateUrl = UriComponentsBuilder.fromHttpUrl("https://" + auth0Domain + "/api/v2/users/{userId}")
                    .buildAndExpand(auth0UserId)
                    .toUriString();
            
            Map<String, Object> requestBody = new HashMap<>();
            if (name != null) {
                requestBody.put("name", name);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(getAccessToken());
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            restTemplate.exchange(updateUrl, HttpMethod.PATCH, request, String.class);
            
            logger.info("Successfully updated Auth0 user: {}", auth0UserId);
        } catch (HttpClientErrorException e) {
            logger.error("HTTP error updating Auth0 user {}: {} - Response body: {}", 
                    auth0UserId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to update Auth0 user: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("Error updating Auth0 user {}: {}", auth0UserId, e.getMessage(), e);
            throw new RuntimeException("Failed to update Auth0 user", e);
        }
    }
    
    /**
     * Delete a user from Auth0.
     * @param auth0UserId The Auth0 user ID
     * @throws RuntimeException if the deletion fails
     */
    public void deleteUser(String auth0UserId) {
        try {
            logger.info("Deleting Auth0 user: {}", auth0UserId);
            
            // UriComponentsBuilder will automatically URL-encode the path variable
            // Auth0 user IDs contain '|' which will be properly encoded as '%7C'
            String deleteUrl = UriComponentsBuilder.fromHttpUrl("https://" + auth0Domain + "/api/v2/users/{userId}")
                    .buildAndExpand(auth0UserId)
                    .toUriString();
            
            logger.debug("Delete URL: {}", deleteUrl);
            
            // Get access token and verify it's valid
            String token = getAccessToken();
            if (token == null || token.trim().isEmpty()) {
                logger.error("Access token is null or empty");
                throw new RuntimeException("Access token is null or empty");
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            logger.debug("Sending DELETE request to Auth0 Management API");
            ResponseEntity<String> response = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully deleted Auth0 user: {}", auth0UserId);
            } else {
                logger.warn("Unexpected status code when deleting Auth0 user {}: {}", auth0UserId, response.getStatusCode());
            }
        } catch (HttpClientErrorException e) {
            String errorBody = e.getResponseBodyAsString();
            logger.error("HTTP error deleting Auth0 user {}: {} - Response body: {}", 
                    auth0UserId, e.getStatusCode(), errorBody);
            
            // Provide more helpful error message
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                logger.error("Authentication failed. Possible causes:");
                logger.error("1. Access token is invalid or expired");
                logger.error("2. Access token does not have 'delete:users' permission");
                logger.error("3. Auth0 Management API client does not have required scopes");
                logger.error("4. Client credentials are incorrect");
            }
            
            throw new RuntimeException("Failed to delete Auth0 user: " + e.getStatusCode() + " - " + errorBody, e);
        } catch (Exception e) {
            logger.error("Error deleting Auth0 user {}: {}", auth0UserId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete Auth0 user: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get user information from Auth0.
     * @param auth0UserId The Auth0 user ID
     * @return User information as JsonNode
     */
    public JsonNode getUser(String auth0UserId) {
        try {
            logger.info("Fetching Auth0 user: {}", auth0UserId);
            
            // UriComponentsBuilder will automatically URL-encode the path variable
            String getUserUrl = UriComponentsBuilder.fromHttpUrl("https://" + auth0Domain + "/api/v2/users/{userId}")
                    .buildAndExpand(auth0UserId)
                    .toUriString();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(getAccessToken());
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<JsonNode> responseEntity = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, JsonNode.class);
            JsonNode response = responseEntity.getBody();
            
            logger.info("Successfully fetched Auth0 user: {}", auth0UserId);
            return response;
        } catch (HttpClientErrorException e) {
            logger.error("HTTP error fetching Auth0 user {}: {} - Response body: {}", 
                    auth0UserId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to fetch Auth0 user: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("Error fetching Auth0 user {}: {}", auth0UserId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch Auth0 user", e);
        }
    }
}

