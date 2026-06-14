package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.dtos.UpdateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.ResultEntryService;
import com.mikko_huttunen.scoreboards.services.ResultService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public ResultEntryController(ResultEntryService resultEntryService, ResultService resultService, CurrentUserContext currentUserContext) {
        this.resultEntryService = resultEntryService;
        this.resultService = resultService;
        this.currentUserContext = currentUserContext;
    }
    
    /**
     * Get all active result entries for a specific session.
     * @param sessionId The session ID
     * @return ResponseEntity containing a list of result entries
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<ResultEntry>> getResultEntriesBySession(@PathVariable String sessionId) {
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
     * Get all active result entries for the current user.
     * @return ResponseEntity containing a list of result entries
     */
    @GetMapping("/user")
    public ResponseEntity<List<ResultEntry>> getResultEntriesByUser() {
        User user = currentUserContext.requireCurrentUser();
        logger.info("GET /api/result-entries/user - Fetching result entries for user: {}", user.getId());
        
        try {
            List<ResultEntry> entries = resultEntryService.getResultEntriesByUser(user.getId());
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
     * @return ResponseEntity containing the result entry if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<ResultEntry> getResultEntryById(@PathVariable String id) {
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
     * @return ResponseEntity containing a list of results
     */
    @GetMapping("/{id}/results")
    public ResponseEntity<List<Result>> getResultsByResultEntry(@PathVariable String id) {
        logger.info("GET /api/result-entries/{}/results - Fetching results", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/result-entries/{}/results - Invalid result entry ID", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<Result> resultEntries = resultService.getResultsByResultEntryId(id);
            logger.info("GET /api/result-entries/{}/results - Found {} results", id, resultEntries.size());
            return ResponseEntity.ok(resultEntries);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/result-entries/{}/results - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("GET /api/result-entries/{}/results - Error fetching results: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Update an existing result entry.
     * @param id The ID of the result entry to update
     * @param dto The updated result entry data
     * @return ResponseEntity containing the updated result entry if found
     */
    @PutMapping("/{id}")
    public ResponseEntity<ResultEntry> updateResultEntry(
            @PathVariable String id,
            @Valid @RequestBody UpdateResultEntryDTO dto) {
        logger.info("PUT /api/result-entries/{} - Updating result entry", id);

        if (id == null || id.trim().isEmpty()) {
            logger.warn("PUT /api/result-entries/{} - Invalid result entry ID", id);
            return ResponseEntity.badRequest().build();
        }

        if (dto == null) {
            logger.warn("PUT /api/result-entries/{} - Request body is null", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            ResultEntry updatedEntry = resultEntryService.updateResultEntry(
                    id,
                    dto.getScoreboardId(),
                    dto.getSessionId(),
                    dto.getResults());
            if (updatedEntry != null) {
                logger.info("PUT /api/result-entries/{} - Successfully updated result entry", id);
                return ResponseEntity.ok(updatedEntry);
            } else {
                logger.warn("PUT /api/result-entries/{} - Result entry not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/result-entries/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/result-entries/{} - Error updating result entry: {}",
                    id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The ID of the result entry to delete
     * @return ResponseEntity containing the deleted result entry if found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ResultEntry> deleteResultEntry(@PathVariable String id) {
        logger.info("DELETE /api/result-entries/{} - Deleting result entry", id);
        
        try {
            ResultEntry deleted = resultEntryService.deleteResultEntry(id);
            if (deleted == null) {
                logger.warn("DELETE /api/result-entries/{} - Result entry not found", id);
                return ResponseEntity.notFound().build();
            }
            logger.info("DELETE /api/result-entries/{} - Successfully deleted result entry", id);
            return ResponseEntity.ok(deleted);
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/result-entries/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("DELETE /api/result-entries/{} - Error deleting result entry: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

