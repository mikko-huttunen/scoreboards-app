package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.InvitationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for managing invitations.
 */
@RestController
@RequestMapping("/api/invitations")
@CrossOrigin(origins = "*")
public class InvitationController {
    
    private static final Logger logger = LoggerFactory.getLogger(InvitationController.class);
    
    private final InvitationService invitationService;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public InvitationController(InvitationService invitationService, CurrentUserContext currentUserContext) {
        this.invitationService = invitationService;
        this.currentUserContext = currentUserContext;
    }
    
    /**
     * Create a new invitation.
     * @param request The request body containing receiverEmail and scoreboardId
     * @return ResponseEntity with created Invitation or error response
     */
    @PostMapping
    public ResponseEntity<Invitation> createInvitation(@RequestBody Map<String, String> request) {
        logger.info("POST /api/invitations - Creating new invitation with request: {}", request);
        
        try {
            String receiverEmail = request.get("receiverEmail");
            String scoreboardId = request.get("scoreboardId");
            
            if (receiverEmail == null || receiverEmail.trim().isEmpty()) {
                logger.error("POST /api/invitations - Bad request: receiverEmail is required");
                return ResponseEntity.badRequest().build();
            }
            if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
                logger.error("POST /api/invitations - Bad request: scoreboardId is required");
                return ResponseEntity.badRequest().build();
            }
            
            Invitation invitation = invitationService.createInvitation(receiverEmail, scoreboardId);
            logger.info("POST /api/invitations - Successfully created invitation: {}", invitation);
            return ResponseEntity.status(HttpStatus.CREATED).body(invitation);
        } catch (IllegalArgumentException e) {
            logger.error("POST /api/invitations - Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("POST /api/invitations - Failed to create invitation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all pending invitations for the current user.
     * @return ResponseEntity containing a list of pending invitations
     */
    @GetMapping
    public ResponseEntity<List<Invitation>> getInvitations() {
        logger.info("GET /api/invitations - Fetching pending invitations for user");
        User user = currentUserContext.requireCurrentUser();
        
        try {
            List<Invitation> invitations = invitationService.getInvitationsByUserId(user.getId());
            logger.info("GET /api/invitations - Successfully retrieved {} pending invitations", invitations.size());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            logger.error("GET /api/invitations - Error fetching pending invitations: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get invitation by ID.
     * @param id The invitation ID
     * @return ResponseEntity containing the invitation if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Invitation> getInvitationById(@PathVariable String id) {
        logger.info("GET /api/invitations/{} - Fetching invitation", id);
        
        try {
            Optional<Invitation> invitation = invitationService.getInvitationById(id);
            if (invitation.isPresent()) {
                logger.info("GET /api/invitations/{} - Successfully retrieved invitation", id);
                return ResponseEntity.ok(invitation.get());
            } else {
                logger.warn("GET /api/invitations/{} - Invitation not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/invitations/{} - Error fetching invitation: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Accept an invitation.
     * @param id The invitation ID
     * @return ResponseEntity containing the accepted invitation
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<Invitation> acceptInvitation(@PathVariable String id) {
        logger.info("PUT /api/invitations/{}/accept - Accepting invitation", id);
        
        try {
            Invitation invitation = invitationService.acceptInvitation(id);
            logger.info("PUT /api/invitations/{}/accept - Successfully accepted invitation", id);
            return ResponseEntity.ok(invitation);
        } catch (IllegalArgumentException e) {
            logger.error("PUT /api/invitations/{}/accept - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/invitations/{}/accept - Error accepting invitation: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete an invitation.
     * @param id The invitation ID
     * @return ResponseEntity with the deleted invitation or error response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Invitation> deleteInvitation(@PathVariable String id) {
        logger.info("DELETE /api/invitations/{} - Deleting invitation", id);
        
        try {
            Invitation deleted = invitationService.deleteInvitations(Set.of(id)).getFirst();
            if (deleted == null) {
                logger.warn("DELETE /api/invitations/{} - Invitation not found", id);
                return ResponseEntity.notFound().build();
            }
            logger.info("DELETE /api/invitations/{} - Successfully deleted invitation", id);
            return ResponseEntity.ok(deleted);
        } catch (IllegalArgumentException e) {
            logger.error("DELETE /api/invitations/{} - Invalid request: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("DELETE /api/invitations/{} - Error deleting invitation: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

