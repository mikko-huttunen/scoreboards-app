package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.services.ScoreboardService;
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
 * REST controller for Scoreboard operations.
 * Provides endpoints for CRUD operations on scoreboards.
 */
@RestController
@RequestMapping("/api/scoreboards")
public class ScoreboardController {
    
    private static final Logger logger = LoggerFactory.getLogger(ScoreboardController.class);
    
    private final ScoreboardService scoreboardService;
    
    @Autowired
    public ScoreboardController(ScoreboardService scoreboardService) {
        this.scoreboardService = scoreboardService;
    }

    /**
     * Create a new scoreboard.
     * @param dto The DTO containing scoreboard and point category data
     * @return ResponseEntity containing the created scoreboard
     */
    @PostMapping
    public ResponseEntity<Scoreboard> createScoreboard(@Valid @RequestBody ScoreboardDTO dto) {
        logger.info("POST /api/scoreboards - Creating new scoreboard");

        Scoreboard createdScoreboard = scoreboardService.createScoreboard(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdScoreboard);
    }

    /**
     * Get all active scoreboards that the current user has created or joined.
     * @return ResponseEntity containing a list of scoreboards
     */
    @GetMapping
    public ResponseEntity<List<Scoreboard>> getScoreboardsByCurrentUser() {
        logger.info("GET /api/scoreboards - Fetching scoreboards for user");

        List<Scoreboard> scoreboards = scoreboardService.getScoreboardsByUser();

        return ResponseEntity.status(HttpStatus.OK).body(scoreboards);

    }

    /**
     * Get a scoreboard by ID with all associated data.
     * @param id The scoreboard ID
     * @return ResponseEntity containing the scoreboard with all related data if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Scoreboard> getScoreboardWithData(@PathVariable String id) {
        logger.info("GET /api/scoreboards/{} - Fetching scoreboard", id);

        Scoreboard scoreboard = scoreboardService.getScoreboardWithData(id);

        return ResponseEntity.status(HttpStatus.OK).body(scoreboard);
    }

    /**
     * Update an existing scoreboard.
     * @param id The ID of the scoreboard to update
     * @param scoreboard The updated scoreboard data
     * @return ResponseEntity containing the updated scoreboard if found
     */
    @PutMapping("/{id}")
    public ResponseEntity<Scoreboard> updateScoreboard(
            @PathVariable String id,
            @Valid @RequestBody ScoreboardDTO scoreboard) {
        logger.info("PUT /api/scoreboards/{} - Updating scoreboard", id);

        Scoreboard updatedScoreboard = scoreboardService.updateScoreboard(id, scoreboard);

        return ResponseEntity.status(HttpStatus.OK).body(updatedScoreboard);
    }

    /**
     * Delete a scoreboard by ID (soft delete).
     * @param id The ID of the scoreboard to delete
     * @return ResponseEntity with a deleted scoreboard if successful
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Scoreboard> deleteScoreboard(@PathVariable String id) {
        logger.info("DELETE /api/scoreboards/{} - Deleting scoreboard", id);

        List<Scoreboard> deleted = scoreboardService.deleteScoreboards(Set.of(id));

        return ResponseEntity.status(HttpStatus.OK).body(deleted.getFirst());
    }
    
    /**
     * Leave a scoreboard (remove user from joined scoreboards).
     * @param id The ID of the scoreboard to leave from
     * @return ResponseEntity with no content if left successfully
     */
    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leaveScoreboard(@PathVariable String id) {
        logger.info("POST /api/scoreboards/{}/leave - User is leaving scoreboard", id);

        scoreboardService.leaveScoreboard(id);

        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
    
    /**
     * Remove a user from a scoreboard (only creator can remove users).
     * @param scoreboardId The ID of the scoreboard to remove the user from
     * @param userId The ID of the user to remove
     */
    @PostMapping("/{scoreboardId}/remove/{userId}")
    public ResponseEntity<Void> removeUserFromScoreboard(
            @PathVariable String scoreboardId,
            @PathVariable String userId) {
        logger.info("POST /api/scoreboards/{}/remove/{} - Removing user from scoreboard", scoreboardId, userId);

        scoreboardService.removeUserFromScoreboard(scoreboardId, userId);

        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}

