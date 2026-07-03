package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.CreateInvitationDTO;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.InvitationService;
import jakarta.validation.Valid;
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
     * @param dto The DTO containing invitation data
     * @return ResponseEntity with created Invitation or error response
     */
    @PostMapping
    public ResponseEntity<Invitation> createInvitation(@Valid @RequestBody CreateInvitationDTO dto) {
        logger.info("POST /api/invitations - Creating new invitation");

        Invitation invitation = invitationService.createInvitation(
                dto.getReceiverEmail(),
                dto.getScoreboardId(),
                dto.getPermissions()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(invitation);
    }
    
    /**
     * Get all pending invitations for the current user.
     * @return ResponseEntity containing a list of pending invitations
     */
    @GetMapping
    public ResponseEntity<List<Invitation>> getInvitations() {
        logger.info("GET /api/invitations - Fetching invitations for user");
        User user = currentUserContext.requireCurrentUser();

        List<Invitation> invitations = invitationService.getInvitationsByUserId(user.getId());

        return ResponseEntity.status(HttpStatus.OK).body(invitations);
    }
    
    /**
     * Get invitation by ID.
     * @param id The invitation ID
     * @return ResponseEntity containing the invitation if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<Invitation> getInvitationById(@PathVariable String id) {
        logger.info("GET /api/invitations/{} - Fetching invitation", id);

        Invitation invitation = invitationService.getInvitationById(id);

        return ResponseEntity.status(HttpStatus.OK).body(invitation);
    }
    
    /**
     * Accept an invitation.
     * @param id The invitation ID
     * @return ResponseEntity containing the accepted invitation
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<Invitation> acceptInvitation(@PathVariable String id) {
        logger.info("PUT /api/invitations/{}/accept - Accepting invitation", id);

        Invitation invitation = invitationService.acceptInvitation(id);

        return ResponseEntity.status(HttpStatus.OK).body(invitation);
    }
    
    /**
     * Delete an invitation.
     * @param id The invitation ID
     * @return ResponseEntity with the deleted invitation or error response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Invitation> deleteInvitation(@PathVariable String id) {
        logger.info("DELETE /api/invitations/{} - Deleting invitation", id);

        Invitation deleted = invitationService.deleteInvitations(Set.of(id)).getFirst();

        return ResponseEntity.status(HttpStatus.OK).body(deleted);
    }
}

