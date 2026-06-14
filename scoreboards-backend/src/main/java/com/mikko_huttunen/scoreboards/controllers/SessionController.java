package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.CreateSessionDTO;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.dtos.UpdateSessionDTO;
import com.mikko_huttunen.scoreboards.services.SessionService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for Session operations.
 * Provides endpoints for CRUD operations on sessions.
 */
@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
public class SessionController {
    
    private static final Logger logger = LoggerFactory.getLogger(SessionController.class);
    
    private final SessionService sessionService;
    
    @Autowired
    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Create a new session.
     * @param dto The DTO containing session data
     * @return ResponseEntity containing the created session
     */
    @PostMapping
    public ResponseEntity<Session> createSession(
            @Valid @RequestBody CreateSessionDTO dto) {
        logger.info("POST /api/sessions - Creating new session for scoreboard: {}",
                dto != null ? dto.getScoreboardName() : "null");

        if (dto == null) {
            logger.error("POST /api/sessions - Request body is null");
            return ResponseEntity.badRequest().build();
        }

        try {
            Session createdSession = sessionService.createSession(
                    dto.getScoreboardId(),
                    dto.getScoreboardName(),
                    dto.getParticipants(),
                    dto.getPointCategories()
            );
            logger.info("POST /api/sessions - Successfully created session with ID: {}", createdSession.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdSession);
        } catch (IllegalArgumentException e) {
            logger.warn("POST /api/sessions - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("POST /api/sessions - Error creating session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all active sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return ResponseEntity containing a list of sessions
     */
    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<List<Session>> getSessionsByScoreboardId(
            @PathVariable String scoreboardId) {
        logger.info("GET /api/sessions/scoreboard/{} - Fetching sessions", scoreboardId);

        try {
            List<Session> sessions = sessionService.getSessionsByScoreboardId(scoreboardId);
            logger.info("GET /api/sessions/scoreboard/{} - Found {} sessions", scoreboardId, sessions.size());
            return ResponseEntity.ok(sessions);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/sessions/scoreboard/{} - Invalid request: {}", scoreboardId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("GET /api/sessions/scoreboard/{} - Error fetching sessions: {}",
                    scoreboardId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get a session by ID.
     * @param id The session ID
     * @return ResponseEntity containing the session if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Session> getSessionById(
            @PathVariable String id) {
        logger.info("GET /api/sessions/{} - Fetching session", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/sessions/{} - Invalid session ID", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Optional<Session> session = sessionService.getSessionById(id);

            if (session.isEmpty()) {
                logger.warn("GET /api/sessions/{} - Session not found", id);
                return ResponseEntity.notFound().build();
            }

            logger.info("GET /api/sessions/{} - Found session", id);
            return ResponseEntity.ok(session.get());
        } catch (Exception e) {
            logger.error("GET /api/sessions/{} - Error fetching session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Update an existing session.
     * @param id The ID of the session to update
     * @param dto The DTO containing updated session data
     * @return ResponseEntity containing the updated session if found
     */
    @PutMapping("/{id}")
    public ResponseEntity<Session> updateSession(
            @PathVariable String id,
            @Valid @RequestBody UpdateSessionDTO dto) {
        logger.info("PUT /api/sessions/{} - Updating session", id);
        
        if (dto == null) {
            logger.error("PUT /api/sessions/{} - Request body is null", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Session updatedSession = sessionService.updateSession(
                    id,
                    dto.getPending(),
                    dto.getParticipants(),
                    dto.getPointCategories(),
                    dto.getResultEntries()
            );
            if (updatedSession != null) {
                logger.info("PUT /api/sessions/{} - Successfully updated session", id);
                return ResponseEntity.ok(updatedSession);
            } else {
                logger.warn("PUT /api/sessions/{} - Session not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/sessions/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/sessions/{} - Error updating session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete a session (soft delete).
     * @param id The ID of the session to delete
     * @return ResponseEntity with no content if deleted
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Session> deleteSession(
            @PathVariable String id) {
        logger.info("DELETE /api/sessions/{} - Deleting session", id);
        
        try {
            Session deleted = sessionService.deleteSessions(Set.of(id)).getFirst();
            if (deleted == null) {
                logger.warn("DELETE /api/sessions/{} - Session not found", id);
                return ResponseEntity.notFound().build();
            }
            logger.info("DELETE /api/sessions/{} - Successfully deleted session", id);
            return ResponseEntity.ok(deleted);
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/sessions/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("DELETE /api/sessions/{} - Error deleting session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Finish a session (check all participants submitted and mark as complete).
     * @param id The ID of the session to finish
     * @return ResponseEntity containing the finished session if found
     */
    @PutMapping("/{id}/finish")
    public ResponseEntity<Session> finishSession(
            @PathVariable String id) {
        logger.info("PUT /api/sessions/{}/finish - Finishing session", id);
        
        try {
            Session finishedSession = sessionService.finishSession(id);
            if (finishedSession != null) {
                logger.info("PUT /api/sessions/{}/finish - Successfully finished session", id);
                return ResponseEntity.ok(finishedSession);
            } else {
                logger.warn("PUT /api/sessions/{}/finish - Session not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/sessions/{}/finish - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/sessions/{}/finish - Error finishing session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

