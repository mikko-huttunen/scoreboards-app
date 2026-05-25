package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.CreateScoreboardDTO;
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
import java.util.Optional;
import java.util.Set;

/**
 * REST controller for Scoreboard operations.
 * Provides endpoints for CRUD operations on scoreboards.
 */
@RestController
@RequestMapping("/api/scoreboards")
@CrossOrigin(origins = "*")
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
    public ResponseEntity<Scoreboard> createScoreboard(@Valid @RequestBody CreateScoreboardDTO dto) {
        logger.info("POST /api/scoreboards - Creating new scoreboard with name: {}", dto.getName());

        try {
            Scoreboard createdScoreboard = scoreboardService.createScoreboard(dto);
            logger.info("POST /api/scoreboards - Successfully created scoreboard with ID: {}",
                    createdScoreboard.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdScoreboard);
        } catch (IllegalArgumentException e) {
            logger.warn("POST /api/scoreboards - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("POST /api/scoreboards - Error creating scoreboard: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all active scoreboards that the current user has created or joined.
     * @return ResponseEntity containing a list of scoreboards
     */
    @GetMapping
    public ResponseEntity<List<Scoreboard>> getScoreboardsByCurrentUser() {
        logger.info("GET /api/scoreboards - Fetching scoreboards for user");

        try {
            List<Scoreboard> scoreboards = scoreboardService.getScoreboardsByUser();
            logger.info("GET /api/scoreboards - Successfully retrieved {} scoreboards for user", scoreboards.size());
            return ResponseEntity.ok(scoreboards);
        } catch (Exception e) {
            logger.error("GET /api/scoreboards - Error fetching scoreboards: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get a scoreboard by ID.
     * @param id The scoreboard ID
     * @return ResponseEntity containing the scoreboard if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Scoreboard> getScoreboardById(@PathVariable String id) {
        logger.info("GET /api/scoreboards/{} - Fetching scoreboard", id);

        try {
            Optional<Scoreboard> scoreboard = scoreboardService.getScoreboardById(id);

            if (scoreboard.isPresent()) {
                logger.info("GET /api/scoreboards/{} - Successfully retrieved scoreboard", id);
                return ResponseEntity.ok(scoreboard.get());
            } else {
                logger.warn("GET /api/scoreboards/{} - Scoreboard not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/scoreboards/{} - Error fetching scoreboard: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
            @Valid @RequestBody Scoreboard scoreboard) {
        logger.info("PUT /api/scoreboards/{} - Updating scoreboard", id);

        try {
            Optional<Scoreboard> updatedScoreboard = scoreboardService.updateScoreboard(id, scoreboard);

            if (updatedScoreboard.isPresent()) {
                logger.info("PUT /api/scoreboards/{} - Successfully updated scoreboard", id);
                return ResponseEntity.ok(updatedScoreboard.get());
            } else {
                logger.warn("PUT /api/scoreboards/{} - Scoreboard not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/scoreboards/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/scoreboards/{} - Error updating scoreboard: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete a scoreboard by ID (soft delete).
     * @param id The ID of the scoreboard to delete
     * @return ResponseEntity with no content if deleted successfully
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScoreboard(@PathVariable String id) {
        logger.info("DELETE /api/scoreboards/{} - Deleting scoreboard", id);

        try {
            List<Scoreboard> deleted = scoreboardService.deleteScoreboards(Set.of(id));
            if (deleted.isEmpty()) {
                logger.warn("DELETE /api/scoreboards/{} - Scoreboard not found", id);
                return ResponseEntity.notFound().build();
            }

            logger.info("DELETE /api/scoreboards/{} - Successfully deleted scoreboard", id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/scoreboards/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("DELETE /api/scoreboards/{} - Error deleting scoreboard: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Leave a scoreboard (remove user from joined scoreboards).
     * @param id The ID of the scoreboard to leave from
     * @return ResponseEntity with no content if left successfully
     */
    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leaveScoreboard(@PathVariable String id) {
        logger.info("POST /api/scoreboards/{}/leave - User leaving scoreboard", id);
        
        try {
            boolean left = scoreboardService.leaveScoreboard(id);
            if (left) {
                logger.info("POST /api/scoreboards/{}/leave - Successfully left scoreboard", id);
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("POST /api/scoreboards/{}/leave - User is not a member of scoreboard", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.error("POST /api/scoreboards/{}/leave - Bad request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("POST /api/scoreboards/{}/leave - Error: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
        
        try {
            boolean removed = scoreboardService.removeUserFromScoreboard(scoreboardId, userId);
            if (removed) {
                logger.info("POST /api/scoreboards/{}/remove/{} - Successfully removed user", scoreboardId, userId);
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("POST /api/scoreboards/{}/remove/{} - User is not a member of scoreboard", scoreboardId, userId);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.error("POST /api/scoreboards/{}/remove/{} - Bad request: {}", scoreboardId, userId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("POST /api/scoreboards/{}/remove/{} - Error: {}", scoreboardId, userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

