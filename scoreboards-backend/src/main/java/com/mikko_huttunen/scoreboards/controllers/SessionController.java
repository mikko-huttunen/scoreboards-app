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
        logger.info("POST /api/sessions - Creating new session");

        Session createdSession = sessionService.createSession(
                dto.getScoreboardId(),
                dto.getScoreboardName(),
                dto.getParticipants(),
                dto.getPointCategories()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(createdSession);
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

        List<Session> sessions = sessionService.getSessionsByScoreboardId(scoreboardId);

        return ResponseEntity.status(HttpStatus.OK).body(sessions);
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

        Session session = sessionService.getSessionById(id);

        return ResponseEntity.status(HttpStatus.OK).body(session);
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

        Session updatedSession = sessionService.updateSession(
                id,
                dto.getPending(),
                dto.getParticipants(),
                dto.getPointCategories(),
                dto.getResultEntries()
        );

        return ResponseEntity.status(HttpStatus.OK).body(updatedSession);
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

        Session deleted = sessionService.deleteSessions(Set.of(id)).getFirst();

        return ResponseEntity.status(HttpStatus.OK).body(deleted);
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

        Session finishedSession = sessionService.finishSession(id);

        return ResponseEntity.status(HttpStatus.OK).body(finishedSession);
    }
}

