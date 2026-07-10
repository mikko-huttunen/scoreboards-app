package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.dtos.UpdateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.ResultEntryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

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
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public ResultEntryController(
            ResultEntryService resultEntryService,
            CurrentUserContext currentUserContext) {
        this.resultEntryService = resultEntryService;
        this.currentUserContext = currentUserContext;
    }

    @PostMapping()
    public ResponseEntity<ResultEntry> createResultEntry(@Valid @RequestBody UpdateResultEntryDTO dto) {
        logger.info("POST /api/result-entries - Creating result entry");

        ResultEntry createdEntry = resultEntryService.createResultEntry(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdEntry);
    }

    /**
     * Get all result entries for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return ResponseEntity containing a list of result entries
     */
    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<List<ResultEntry>> getResultEntriesByScoreboard(@PathVariable String scoreboardId) {
        logger.info("GET /api/result-entries/scoreboard/{} - Fetching result entries", scoreboardId);

        List<ResultEntry> resultEntries = resultEntryService.getResultEntriesByScoreboard(scoreboardId);

        return ResponseEntity.status(HttpStatus.OK).body(resultEntries);
    }
    
    /**
     * Get all active result entries for the current user.
     * @return ResponseEntity containing a list of result entries
     */
    @GetMapping("/user")
    public ResponseEntity<List<ResultEntry>> getResultEntriesByUser() {
        User user = currentUserContext.requireCurrentUser();
        logger.info("GET /api/result-entries/user - Fetching result entries for current user");

        List<ResultEntry> entries = resultEntryService.getResultEntriesByUser(user.getId());

        return ResponseEntity.status(HttpStatus.OK).body(entries);
    }
    
    /**
     * Get a result entry by ID.
     * @param id The result entry ID
     * @return ResponseEntity containing the result entry if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<ResultEntry> getResultEntryById(@PathVariable String id) {
        logger.info("GET /api/result-entries/{} - Fetching result entry", id);

        ResultEntry entry = resultEntryService.getResultEntryById(id);

        return ResponseEntity.status(HttpStatus.OK).body(entry);
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

        ResultEntry updatedEntry = resultEntryService.updateResultEntry(id, dto);

        return ResponseEntity.status(HttpStatus.OK).body(updatedEntry);
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The ID of the result entry to delete
     * @return ResponseEntity containing the deleted result entry if found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ResultEntry> deleteResultEntry(@PathVariable String id) {
        logger.info("DELETE /api/result-entries/{} - Deleting result entry", id);

        ResultEntry deleted = resultEntryService.deleteResultEntry(id);

        return ResponseEntity.status(HttpStatus.OK).body(deleted);
    }
}

