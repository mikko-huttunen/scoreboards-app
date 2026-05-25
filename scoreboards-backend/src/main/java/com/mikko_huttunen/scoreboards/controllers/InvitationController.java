package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.services.InvitationService;
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
import java.util.Optional;

/**
 * REST controller for managing invitations.
 */
@RestController
@RequestMapping("/api/invitations")
@CrossOrigin(origins = "*")
public class InvitationController {
    
    private static final Logger logger = LoggerFactory.getLogger(InvitationController.class);
    
    private final InvitationService invitationService;
    
    @Autowired
    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }
    
    /**
     * Extract user ID from JWT token.
     * @param jwt JWT token
     * @return User ID or null if not found
     */
    private String getUserIdFromJwt(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        String userId = jwt.getClaimAsString("sub");
        if (userId == null) {
            userId = jwt.getClaimAsString("user_id");
        }
        if (userId == null) {
            userId = jwt.getClaimAsString("id");
        }
        return userId;
    }
    
    /**
     * Create a new invitation.
     * POST /api/invitations
     */
    @PostMapping
    public ResponseEntity<?> createInvitation(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to create invitation");
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String receiverEmail = request.get("receiverEmail");
            String scoreboardId = request.get("scoreboardId");
            
            if (receiverEmail == null || receiverEmail.trim().isEmpty()) {
                logger.error("Bad request: receiverEmail is required");
                return ResponseEntity.badRequest().body(createErrorResponse("receiverEmail is required"));
            }
            if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
                logger.error("Bad request: scoreboardId is required");
                return ResponseEntity.badRequest().body(createErrorResponse("scoreboardId is required"));
            }
            
            Invitation invitation = invitationService.createInvitation(receiverEmail, scoreboardId, userId);
            logger.info("Successfully created invitation with ID: {}", invitation.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(invitation);
        } catch (IllegalArgumentException e) {
            logger.error("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error creating invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to create invitation: " + e.getMessage()));
        }
    }
    
    /**
     * Get all pending invitations for the current user.
     * GET /api/invitations/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<List<Invitation>> getPendingInvitations(@AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to get pending invitations");
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            List<Invitation> invitations = invitationService.getPendingInvitations(userId);
            logger.info("Successfully retrieved {} pending invitations", invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            logger.error("Error fetching pending invitations: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all invitations for the current user.
     * GET /api/invitations/me
     */
    @GetMapping("/me")
    public ResponseEntity<List<Invitation>> getMyInvitations(@AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to get user's invitations");
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            List<Invitation> invitations = invitationService.getInvitationsByReceiver(userId);
            logger.info("Successfully retrieved {} invitations", invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            logger.error("Error fetching invitations: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all invitations for a scoreboard.
     * GET /api/invitations/scoreboard/{scoreboardId}
     */
    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<List<Invitation>> getInvitationsByScoreboard(
            @PathVariable String scoreboardId,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to get invitations for scoreboard: {}", scoreboardId);
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            List<Invitation> invitations = invitationService.getInvitationsByScoreboard(scoreboardId);
            logger.info("Successfully retrieved {} invitations for scoreboard", invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            logger.error("Error fetching invitations for scoreboard: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get invitation by ID.
     * GET /api/invitations/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Invitation> getInvitationById(@PathVariable String id) {
        logger.info("Received request to get invitation with ID: {}", id);
        
        try {
            Optional<Invitation> invitation = invitationService.getInvitationById(id);
            if (invitation.isPresent()) {
                logger.info("Successfully retrieved invitation with ID: {}", id);
                return ResponseEntity.ok(invitation.get());
            } else {
                logger.warn("Invitation with ID {} not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error fetching invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Accept an invitation.
     * POST /api/invitations/{id}/accept
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<?> acceptInvitation(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to accept invitation: {}", id);
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Invitation invitation = invitationService.acceptInvitation(id, userId);
            logger.info("Successfully accepted invitation: {}", id);
            return ResponseEntity.ok(invitation);
        } catch (IllegalArgumentException e) {
            logger.error("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error accepting invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to accept invitation: " + e.getMessage()));
        }
    }
    
    /**
     * Decline an invitation.
     * POST /api/invitations/{id}/decline
     */
    @PostMapping("/{id}/decline")
    public ResponseEntity<?> declineInvitation(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to decline invitation: {}", id);
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Invitation invitation = invitationService.declineInvitation(id, userId);
            logger.info("Successfully declined invitation: {}", id);
            return ResponseEntity.ok(invitation);
        } catch (IllegalArgumentException e) {
            logger.error("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error declining invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to decline invitation: " + e.getMessage()));
        }
    }
    
    /**
     * Delete an invitation.
     * DELETE /api/invitations/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInvitation(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Received request to delete invitation: {}", id);
        
        if (jwt == null) {
            logger.error("Unauthorized: No JWT token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String userId = getUserIdFromJwt(jwt);
        if (userId == null) {
            logger.error("Unauthorized: No user ID in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            boolean deleted = invitationService.deleteInvitation(id, userId);
            if (deleted) {
                logger.info("Successfully deleted invitation: {}", id);
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("Invitation with ID {} not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.error("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error deleting invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to delete invitation: " + e.getMessage()));
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

