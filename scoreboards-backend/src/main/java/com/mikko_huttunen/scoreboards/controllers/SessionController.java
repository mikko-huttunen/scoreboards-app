package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.CreateSessionDTO;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.UpdateSessionDTO;
import com.mikko_huttunen.scoreboards.services.SessionService;
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
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the session if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Session> getSessionById(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/sessions/{} - Fetching session", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/sessions/{} - Invalid session ID", id);
            return ResponseEntity.badRequest().build();
        }

        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("GET /api/sessions/{} - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Session session = sessionService.getSessionById(id);
            if (session != null) {
                logger.info("GET /api/sessions/{} - Found session", id);
                return ResponseEntity.ok(session);
            } else {
                logger.warn("GET /api/sessions/{} - Session not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/sessions/{} - Error fetching session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Create a new session.
     * @param dto The DTO containing session data
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the created session
     */
    @PostMapping
    public ResponseEntity<?> createSession(
            @Valid @RequestBody CreateSessionDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("POST /api/sessions - Creating new session for scoreboard: {}", 
                dto != null ? dto.getScoreboardName() : "null");
        
        if (dto == null) {
            logger.error("POST /api/sessions - Request body is null");
            return ResponseEntity.badRequest().body(createErrorResponse("Request body cannot be null"));
        }
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("POST /api/sessions - Unable to extract user ID from JWT");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Session createdSession = sessionService.createSession(
                    dto.getScoreboardId(),
                    dto.getScoreboardName(),
                    dto.getParticipants(),
                    dto.getPointCategories(),
                    userId
            );
            logger.info("POST /api/sessions - Successfully created session with ID: {}", createdSession.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdSession);
        } catch (IllegalArgumentException e) {
            logger.warn("POST /api/sessions - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("POST /api/sessions - Error creating session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to create session: " + e.getMessage()));
        }
    }
    
    /**
     * Update an existing session.
     * @param id The ID of the session to update
     * @param dto The DTO containing updated session data
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the updated session if found
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSession(
            @PathVariable String id,
            @Valid @RequestBody UpdateSessionDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("PUT /api/sessions/{} - Updating session", id);
        
        if (dto == null) {
            logger.error("PUT /api/sessions/{} - Request body is null", id);
            return ResponseEntity.badRequest().body(createErrorResponse("Request body cannot be null"));
        }
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("PUT /api/sessions/{} - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Session updatedSession = sessionService.updateSession(
                    id,
                    dto.getParticipants(),
                    dto.getPointCategories(),
                    userId
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
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("PUT /api/sessions/{} - Error updating session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to update session: " + e.getMessage()));
        }
    }
    
    /**
     * Delete a session (soft delete).
     * @param id The ID of the session to delete
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity with no content if deleted
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSession(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("DELETE /api/sessions/{} - Deleting session", id);
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("DELETE /api/sessions/{} - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            boolean deleted = sessionService.deleteSession(id, userId);
            if (deleted) {
                logger.info("DELETE /api/sessions/{} - Successfully deleted session", id);
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("DELETE /api/sessions/{} - Session not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/sessions/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("DELETE /api/sessions/{} - Error deleting session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to delete session: " + e.getMessage()));
        }
    }
    
    /**
     * Finish a session (check all participants submitted and mark as complete).
     * @param id The ID of the session to finish
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing the finished session if found
     */
    @PostMapping("/{id}/finish")
    public ResponseEntity<?> finishSession(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("POST /api/sessions/{}/finish - Finishing session", id);
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("POST /api/sessions/{}/finish - Unable to extract user ID from JWT", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Session finishedSession = sessionService.finishSession(id, userId);
            if (finishedSession != null) {
                logger.info("POST /api/sessions/{}/finish - Successfully finished session", id);
                return ResponseEntity.ok(finishedSession);
            } else {
                logger.warn("POST /api/sessions/{}/finish - Session not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("POST /api/sessions/{}/finish - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("POST /api/sessions/{}/finish - Error finishing session: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to finish session: " + e.getMessage()));
        }
    }
    
    /**
     * Get all pending sessions for the current user.
     * @param jwt The authenticated user's JWT token
     * @return ResponseEntity containing list of pending sessions
     */
    @GetMapping("/pending")
    public ResponseEntity<List<Session>> getPendingSessions(
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("GET /api/sessions/pending - Fetching pending sessions");
        
        String userId = extractUserId(jwt);
        if (userId == null) {
            logger.warn("GET /api/sessions/pending - Unable to extract user ID from JWT");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            List<Session> sessions = sessionService.getPendingSessionsByUser(userId);
            logger.info("GET /api/sessions/pending - Found {} pending sessions", sessions.size());
            return ResponseEntity.ok(sessions);
        } catch (IllegalArgumentException e) {
            logger.warn("GET /api/sessions/pending - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("GET /api/sessions/pending - Error fetching pending sessions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
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

    /**
     * Extract user ID from JWT token.
     */
    private String extractUserId(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        return jwt.getClaimAsString("sub");
    }
}

