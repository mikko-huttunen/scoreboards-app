package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.CreateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.services.ResultEntryService;
import com.mikko_huttunen.scoreboards.services.ResultService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for ResultEntry operations.
 * Provides endpoints for CRUD operations on result entries.
 */
@RestController
@RequestMapping("/api/result-entries")
@CrossOrigin(origins = "*")
public class ResultEntryController {
    
    private static final Logger logger = LoggerFactory.getLogger(ResultEntryController.class);
    
    private final ResultEntryService resultEntryService;
    private final ResultService resultService;
    
    @Autowired
    public ResultEntryController(ResultEntryService resultEntryService, ResultService resultService) {
        this.resultEntryService = resultEntryService;
        this.resultService = resultService;
    }
    
    /**
     * Extract user ID from JWT token.
     */
    private String extractUserId(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        return jwt.getClaimAsString("sub");
    }
    
    /**
     * Get all active result entries for a specific session.
     * @param sessionId The session ID
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing a list of result entries
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<ResultEntry>> getResultEntriesBySession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/result-entries/session/{} - Fetching result entries", sessionId);
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.warn("GET /api/result-entries/session/{} - Invalid session ID", sessionId);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<ResultEntry> entries = resultEntryService.getResultEntriesBySession(sessionId);
            logger.info("GET /api/result-entries/session/{} - Found {} result entries", sessionId, entries.size());
            return ResponseEntity.ok(entries);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/result-entries/session/{} - Invalid request: {}", sessionId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("GET /api/result-entries/session/{} - Error fetching result entries: {}", 
                    sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get a result entry by session ID and user ID.
     * @param sessionId The session ID
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the result entry if found
     */
    @GetMapping("/session/{sessionId}/user")
    public ResponseEntity<ResultEntry> getResultEntryBySessionAndUser(
            @PathVariable String sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/result-entries/session/{}/user - Fetching result entry", sessionId);
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("GET /api/result-entries/session/{}/user - Unable to extract user ID from JWT", sessionId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.warn("GET /api/result-entries/session/{}/user - Invalid session ID", sessionId);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            ResultEntry entry = resultEntryService.getResultEntryBySessionAndUser(sessionId, userId);
            if (entry != null) {
                logger.info("GET /api/result-entries/session/{}/user - Found result entry", sessionId);
                return ResponseEntity.ok(entry);
            } else {
                logger.warn("GET /api/result-entries/session/{}/user - Result entry not found", sessionId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/result-entries/session/{}/user - Error fetching result entry: {}", 
                    sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all active result entries for the current user.
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing list of result entries
     */
    @GetMapping("/user")
    public ResponseEntity<List<ResultEntry>> getResultEntriesByUser(
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/result-entries/user - Fetching result entries for user");
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("GET /api/result-entries/user - Unable to extract user ID from JWT");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            List<ResultEntry> entries = resultEntryService.getResultEntriesByUser(userId);
            logger.info("GET /api/result-entries/user - Found {} result entries", entries.size());
            return ResponseEntity.ok(entries);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/result-entries/user - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("GET /api/result-entries/user - Error fetching result entries: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get a result entry by ID.
     * @param id The result entry ID
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the result entry if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<ResultEntry> getResultEntryById(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/result-entries/{} - Fetching result entry", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/result-entries/{} - Invalid result entry ID", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            ResultEntry entry = resultEntryService.getResultEntryById(id);
            if (entry != null) {
                logger.info("GET /api/result-entries/{} - Found result entry", id);
                return ResponseEntity.ok(entry);
            } else {
                logger.warn("GET /api/result-entries/{} - Result entry not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/result-entries/{} - Error fetching result entry: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all results for a specific result entry.
     * @param id The result entry ID
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing list of results
     */
    @GetMapping("/{id}/results")
    public ResponseEntity<?> getResultsByResultEntry(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/result-entries/{}/results - Fetching results", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/result-entries/{}/results - Invalid result entry ID", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<com.mikko_huttunen.scoreboards.models.Result> results = resultService.getResultsByResultEntry(id);
            logger.info("GET /api/result-entries/{}/results - Found {} results", id, results.size());
            return ResponseEntity.ok(results);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/result-entries/{}/results - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("GET /api/result-entries/{}/results - Error fetching results: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to fetch results: " + e.getMessage()));
        }
    }
    
    /**
     * Create a new result entry with results.
     * @param dto The DTO containing result entry data
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the created result entry
     */
    @PostMapping
    public ResponseEntity<?> createResultEntry(
            @Valid @RequestBody CreateResultEntryDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("POST /api/result-entries - Creating new result entry for session: {}", 
                dto != null ? dto.getSessionId() : "null");
        
        if (dto == null) {
            logger.error("POST /api/result-entries - Request body is null");
            return ResponseEntity.badRequest().body(createErrorResponse("Request body cannot be null"));
        }
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("POST /api/result-entries - Unable to extract user ID from JWT");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            // Check if result entry already exists (created during session creation)
            ResultEntry existingEntry = resultEntryService.getResultEntryBySessionAndUser(
                    dto.getSessionId(), userId);
            
            ResultEntry resultEntry;
            if (existingEntry != null) {
                // Update existing result entry
                logger.info("POST /api/result-entries - Updating existing result entry with ID: {}", existingEntry.getId());
                resultEntry = existingEntry;
            } else {
                // Create new result entry
                resultEntry = resultEntryService.createResultEntry(
                        dto.getScoreboardId(),
                        dto.getSessionId(),
                        userId,
                        userId
                );
            }
            
            // Create results and associate them with the result entry
            List<String> resultIds = new java.util.ArrayList<>();
            for (CreateResultEntryDTO.ResultData resultData : dto.getResults()) {
                Result result = resultService.createResult(
                        dto.getScoreboardId(),
                        dto.getSessionId(),
                        resultEntry.getId(),
                        userId,
                        resultData.getPointCategoryId(),
                        resultData.getPoints(),
                        userId
                );
                resultIds.add(result.getId());
            }
            
            // Update result entry with result IDs
            ResultEntry updatedEntry = resultEntryService.updateResultEntry(resultEntry.getId(), resultIds, userId);
            
            logger.info("POST /api/result-entries - Successfully created/updated result entry with ID: {}", updatedEntry.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(updatedEntry);
        } catch (IllegalArgumentException e) {
            logger.warn("POST /api/result-entries - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("POST /api/result-entries - Error creating result entry: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to create result entry: " + e.getMessage()));
        }
    }
    
    /**
     * Update an existing result entry.
     * @param id The ID of the result entry to update
     * @param resultIds List of result IDs
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the updated result entry if found
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateResultEntry(
            @PathVariable String id,
            @RequestBody List<String> resultIds,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("PUT /api/result-entries/{} - Updating result entry", id);
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("PUT /api/result-entries/{} - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            ResultEntry updatedEntry = resultEntryService.updateResultEntry(id, resultIds, userId);
            if (updatedEntry != null) {
                logger.info("PUT /api/result-entries/{} - Successfully updated result entry", id);
                return ResponseEntity.ok(updatedEntry);
            } else {
                logger.warn("PUT /api/result-entries/{} - Result entry not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/result-entries/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("PUT /api/result-entries/{} - Error updating result entry: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to update result entry: " + e.getMessage()));
        }
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The ID of the result entry to delete
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity with no content if deleted
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResultEntry(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("DELETE /api/result-entries/{} - Deleting result entry", id);
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("DELETE /api/result-entries/{} - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            boolean deleted = resultEntryService.deleteResultEntry(id, userId);
            if (deleted) {
                logger.info("DELETE /api/result-entries/{} - Successfully deleted result entry", id);
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("DELETE /api/result-entries/{} - Result entry not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/result-entries/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("DELETE /api/result-entries/{} - Error deleting result entry: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to delete result entry: " + e.getMessage()));
        }
    }
    
    /**
     * Create an error response map.
     */
    private Map<String, String> createErrorResponse(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}

