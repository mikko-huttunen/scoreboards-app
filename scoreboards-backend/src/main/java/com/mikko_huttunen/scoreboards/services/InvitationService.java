package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.InvitationRepository;
import com.mikko_huttunen.scoreboards.repositories.ScoreboardRepository;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service class for handling Invitation business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class InvitationService {
    
    private static final Logger logger = LoggerFactory.getLogger(InvitationService.class);
    
    private final InvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final ScoreboardRepository scoreboardRepository;
    
    @Autowired
    public InvitationService(
            InvitationRepository invitationRepository,
            UserRepository userRepository,
            ScoreboardRepository scoreboardRepository) {
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.scoreboardRepository = scoreboardRepository;
    }
    
    /**
     * Create a new invitation.
     * @param receiverEmail Email of the user to invite
     * @param scoreboardId ID of the scoreboard to invite to
     * @param createdBy ID of the user creating the invitation
     * @return Created invitation
     */
    @Transactional
    public Invitation createInvitation(String receiverEmail, String scoreboardId, String createdBy) {
        logger.info("Creating invitation for email: {} to scoreboard: {} by user: {}", receiverEmail, scoreboardId, createdBy);
        
        try {
            // Validate inputs
            if (receiverEmail == null || receiverEmail.trim().isEmpty()) {
                logger.error("Receiver email cannot be null or empty");
                throw new IllegalArgumentException("Receiver email cannot be null or empty");
            }
            if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
                logger.error("Scoreboard ID cannot be null or empty");
                throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
            }
            if (createdBy == null || createdBy.trim().isEmpty()) {
                logger.error("Created by user ID cannot be null or empty");
                throw new IllegalArgumentException("Created by user ID cannot be null or empty");
            }
            
            // Find receiver by email
            Optional<User> receiverOpt = userRepository.findByEmailAndIsActiveTrue(receiverEmail.trim().toLowerCase());
            if (receiverOpt.isEmpty()) {
                logger.error("User with email {} not found or is inactive", receiverEmail);
                throw new IllegalArgumentException("User with email " + receiverEmail + " not found");
            }
            
            User receiver = receiverOpt.get();
            String receiverId = receiver.getId();
            
            // Check if user is trying to invite themselves
            if (receiverId.equals(createdBy)) {
                logger.error("User {} cannot invite themselves", createdBy);
                throw new IllegalArgumentException("Cannot invite yourself");
            }
            
            // Verify scoreboard exists and is active
            Optional<Scoreboard> scoreboardOpt = scoreboardRepository.findByIdAndIsActiveTrue(scoreboardId);
            if (scoreboardOpt.isEmpty()) {
                logger.error("Scoreboard with ID {} not found or is inactive", scoreboardId);
                throw new IllegalArgumentException("Scoreboard not found");
            }
            
            Scoreboard scoreboard = scoreboardOpt.get();
            
            // Verify the creator owns the scoreboard
            if (!scoreboard.getCreatedBy().equals(createdBy)) {
                logger.error("User {} does not own scoreboard {}", createdBy, scoreboardId);
                throw new IllegalArgumentException("You can only invite users to your own scoreboards");
            }
            
            // Check if user is already a member (creator or joined)
            if (scoreboard.getCreatedBy().equals(receiverId) || 
                receiver.getScoreboards().contains(scoreboardId)) {
                logger.error("User {} is already a member of scoreboard {}", receiverId, scoreboardId);
                throw new IllegalArgumentException("User is already a member of this scoreboard");
            }
            
            // Check if there's already a pending invitation
            if (invitationRepository.existsByReceiverAndScoreboardIdAndIsPendingTrueAndIsActiveTrue(receiverId, scoreboardId)) {
                logger.error("Pending invitation already exists for user {} to scoreboard {}", receiverId, scoreboardId);
                throw new IllegalArgumentException("An invitation has already been sent to this user for this scoreboard");
            }
            
            // Create invitation
            Invitation invitation = new Invitation();
            invitation.setId(UUID.randomUUID().toString());
            invitation.setReceiver(receiverId);
            invitation.setScoreboardId(scoreboardId);
            invitation.setScoreboardName(scoreboard.getName());
            invitation.setIsPending(true);
            invitation.setIsActive(true);
            invitation.setCreatedBy(createdBy);
            invitation.setCreated(new Date());
            invitation.setLastModified(new Date());
            
            Invitation savedInvitation = invitationRepository.save(invitation);
            logger.info("Successfully created invitation with ID: {}", savedInvitation.getId());
            
            return savedInvitation;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating invitation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create invitation: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all pending invitations for a user.
     * @param userId ID of the user
     * @return List of pending invitations
     */
    public List<Invitation> getPendingInvitations(String userId) {
        logger.info("Fetching pending invitations for user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Attempted to fetch invitations with null or empty user ID");
            return List.of();
        }
        
        try {
            List<Invitation> invitations = invitationRepository.findByReceiverAndIsPendingTrueAndIsActiveTrue(userId);
            logger.info("Successfully fetched {} pending invitations for user: {}", invitations.size(), userId);
            return invitations;
        } catch (Exception e) {
            logger.error("Error fetching pending invitations for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch pending invitations", e);
        }
    }
    
    /**
     * Get all invitations for a user.
     * @param userId ID of the user
     * @return List of all active invitations
     */
    public List<Invitation> getInvitationsByReceiver(String userId) {
        logger.info("Fetching all invitations for user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Attempted to fetch invitations with null or empty user ID");
            return List.of();
        }
        
        try {
            List<Invitation> invitations = invitationRepository.findByReceiverAndIsActiveTrue(userId);
            logger.info("Successfully fetched {} invitations for user: {}", invitations.size(), userId);
            return invitations;
        } catch (Exception e) {
            logger.error("Error fetching invitations for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch invitations", e);
        }
    }
    
    /**
     * Get all invitations for a scoreboard.
     * @param scoreboardId ID of the scoreboard
     * @return List of all active invitations
     */
    public List<Invitation> getInvitationsByScoreboard(String scoreboardId) {
        logger.info("Fetching invitations for scoreboard: {}", scoreboardId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Attempted to fetch invitations with null or empty scoreboard ID");
            return List.of();
        }
        
        try {
            List<Invitation> invitations = invitationRepository.findByScoreboardIdAndIsActiveTrue(scoreboardId);
            logger.info("Successfully fetched {} invitations for scoreboard: {}", invitations.size(), scoreboardId);
            return invitations;
        } catch (Exception e) {
            logger.error("Error fetching invitations for scoreboard {}: {}", scoreboardId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch invitations", e);
        }
    }
    
    /**
     * Get invitation by ID.
     * @param invitationId ID of the invitation
     * @return Optional invitation
     */
    public Optional<Invitation> getInvitationById(String invitationId) {
        logger.info("Fetching invitation with ID: {}", invitationId);
        
        if (invitationId == null || invitationId.trim().isEmpty()) {
            logger.warn("Attempted to fetch invitation with null or empty ID");
            return Optional.empty();
        }
        
        try {
            Optional<Invitation> invitation = invitationRepository.findByIdAndIsActiveTrue(invitationId);
            if (invitation.isPresent()) {
                logger.info("Successfully fetched invitation with ID: {}", invitationId);
            } else {
                logger.warn("Invitation with ID {} not found or is inactive", invitationId);
            }
            return invitation;
        } catch (Exception e) {
            logger.error("Error fetching invitation with ID {}: {}", invitationId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch invitation", e);
        }
    }
    
    /**
     * Accept an invitation.
     * @param invitationId ID of the invitation
     * @param userId ID of the user accepting the invitation
     * @return Updated invitation
     */
    @Transactional
    public Invitation acceptInvitation(String invitationId, String userId) {
        logger.info("Accepting invitation {} by user {}", invitationId, userId);
        
        try {
            // Validate inputs
            if (invitationId == null || invitationId.trim().isEmpty()) {
                logger.error("Invitation ID cannot be null or empty");
                throw new IllegalArgumentException("Invitation ID cannot be null or empty");
            }
            if (userId == null || userId.trim().isEmpty()) {
                logger.error("User ID cannot be null or empty");
                throw new IllegalArgumentException("User ID cannot be null or empty");
            }
            
            // Find invitation
            Optional<Invitation> invitationOpt = invitationRepository.findByIdAndIsActiveTrue(invitationId);
            if (invitationOpt.isEmpty()) {
                logger.error("Invitation with ID {} not found or is inactive", invitationId);
                throw new IllegalArgumentException("Invitation not found");
            }
            
            Invitation invitation = invitationOpt.get();
            
            // Verify the invitation is for this user
            if (!invitation.getReceiver().equals(userId)) {
                logger.error("User {} cannot accept invitation {} (belongs to user {})", userId, invitationId, invitation.getReceiver());
                throw new IllegalArgumentException("You can only accept your own invitations");
            }
            
            // Verify the invitation is pending
            if (!invitation.getIsPending()) {
                logger.error("Invitation {} is not pending", invitationId);
                throw new IllegalArgumentException("This invitation has already been processed");
            }
            
            // Find user
            Optional<User> userOpt = userRepository.findByIdAndIsActiveTrue(userId);
            if (userOpt.isEmpty()) {
                logger.error("User with ID {} not found or is inactive", userId);
                throw new IllegalArgumentException("User not found");
            }
            
            User user = userOpt.get();
            
            // Verify scoreboard still exists
            Optional<Scoreboard> scoreboardOpt = scoreboardRepository.findByIdAndIsActiveTrue(invitation.getScoreboardId());
            if (scoreboardOpt.isEmpty()) {
                logger.error("Scoreboard {} no longer exists", invitation.getScoreboardId());
                throw new IllegalArgumentException("Scoreboard no longer exists");
            }

            Scoreboard scoreboard = scoreboardOpt.get();

            // Add user to scoreboard
            Set<String> scoreboardUsers = scoreboard.getUsers();
            if (!scoreboardUsers.contains(userId)) {
                scoreboardUsers.add(userId);
                scoreboard.setLastModified(new Date());
                scoreboardRepository.save(scoreboard);
                logger.info("Added user {} to the scoreboard {}", userId, invitation.getScoreboardId());
            } else {
                logger.info("User {} has already joined the scoreboard {}", userId, invitation.getScoreboardId());
            }
            
            // Add scoreboard to the user
            Set<String> userScoreboards = user.getScoreboards();
            if (!userScoreboards.contains(invitation.getScoreboardId())) {
                userScoreboards.add(invitation.getScoreboardId());
                user.setScoreboards(userScoreboards);
                user.setLastModified(new Date());
                userRepository.save(user);
                logger.info("Added scoreboard {} to the user {}", invitation.getScoreboardId(),userId);
            } else {
                logger.info("Scoreboard {} has already been added to the user {}", invitation.getScoreboardId(), userId);
            }
            
            // Update invitation
            invitation.setIsPending(false);
            invitation.setAcceptedDate(new Date());
            invitation.setIsActive(false); // Soft delete after acceptance
            invitation.setLastModified(new Date());
            
            Invitation savedInvitation = invitationRepository.save(invitation);
            logger.info("Successfully accepted invitation {}", invitationId);
            
            return savedInvitation;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error accepting invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error accepting invitation {}: {}", invitationId, e.getMessage(), e);
            throw new RuntimeException("Failed to accept invitation: " + e.getMessage(), e);
        }
    }
    
    /**
     * Decline an invitation.
     * @param invitationId ID of the invitation
     * @param userId ID of the user declining the invitation
     * @return Updated invitation
     */
    @Transactional
    public Invitation declineInvitation(String invitationId, String userId) {
        logger.info("Declining invitation {} by user {}", invitationId, userId);
        
        try {
            // Validate inputs
            if (invitationId == null || invitationId.trim().isEmpty()) {
                logger.error("Invitation ID cannot be null or empty");
                throw new IllegalArgumentException("Invitation ID cannot be null or empty");
            }
            if (userId == null || userId.trim().isEmpty()) {
                logger.error("User ID cannot be null or empty");
                throw new IllegalArgumentException("User ID cannot be null or empty");
            }
            
            // Find invitation
            Optional<Invitation> invitationOpt = invitationRepository.findByIdAndIsActiveTrue(invitationId);
            if (invitationOpt.isEmpty()) {
                logger.error("Invitation with ID {} not found or is inactive", invitationId);
                throw new IllegalArgumentException("Invitation not found");
            }
            
            Invitation invitation = invitationOpt.get();
            
            // Verify the invitation is for this user
            if (!invitation.getReceiver().equals(userId)) {
                logger.error("User {} cannot decline invitation {} (belongs to user {})", userId, invitationId, invitation.getReceiver());
                throw new IllegalArgumentException("You can only decline your own invitations");
            }
            
            // Verify the invitation is pending
            if (!invitation.getIsPending()) {
                logger.error("Invitation {} is not pending", invitationId);
                throw new IllegalArgumentException("This invitation has already been processed");
            }
            
            // Update invitation
            invitation.setIsPending(false);
            invitation.setAcceptedDate(null);
            invitation.setIsActive(false); // Soft delete after decline
            invitation.setLastModified(new Date());
            
            Invitation savedInvitation = invitationRepository.save(invitation);
            logger.info("Successfully declined invitation {}", invitationId);
            
            return savedInvitation;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error declining invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error declining invitation {}: {}", invitationId, e.getMessage(), e);
            throw new RuntimeException("Failed to decline invitation: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete an invitation (soft delete).
     * @param invitationId ID of the invitation
     * @param userId ID of the user deleting the invitation (must be the creator)
     * @return true if deleted, false if not found
     */
    @Transactional
    public boolean deleteInvitation(String invitationId, String userId) {
        logger.info("Deleting invitation {} by user {}", invitationId, userId);
        
        try {
            if (invitationId == null || invitationId.trim().isEmpty()) {
                logger.error("Invitation ID cannot be null or empty");
                throw new IllegalArgumentException("Invitation ID cannot be null or empty");
            }
            if (userId == null || userId.trim().isEmpty()) {
                logger.error("User ID cannot be null or empty");
                throw new IllegalArgumentException("User ID cannot be null or empty");
            }
            
            Optional<Invitation> invitationOpt = invitationRepository.findByIdAndIsActiveTrue(invitationId);
            if (invitationOpt.isEmpty()) {
                logger.warn("Invitation with ID {} not found or is inactive", invitationId);
                return false;
            }
            
            Invitation invitation = invitationOpt.get();
            
            // Verify the user is the creator of the invitation
            if (!invitation.getCreatedBy().equals(userId)) {
                logger.error("User {} cannot delete invitation {} (created by user {})", userId, invitationId, invitation.getCreatedBy());
                throw new IllegalArgumentException("You can only delete invitations you created");
            }
            
            // Soft delete
            invitation.setIsActive(false);
            invitation.setLastModified(new Date());
            invitationRepository.save(invitation);
            
            logger.info("Successfully deleted invitation {}", invitationId);
            return true;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting invitation {}: {}", invitationId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete invitation: " + e.getMessage(), e);
        }
    }
}

