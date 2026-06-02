package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
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

    private final MongoDBService mongoDBService;
    private final UserService userService;
    private final ScoreboardService scoreboardService;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public InvitationService(MongoDBService mongoDBService,
                             UserService userService,
                             ScoreboardService scoreboardService,
                             CurrentUserContext currentUserContext) {
        this.mongoDBService = mongoDBService;
        this.userService = userService;
        this.scoreboardService = scoreboardService;
        this.currentUserContext = currentUserContext;
    }
    
    /**
     * Create a new invitation.
     * @param receiverEmail Email of the user to invite
     * @param scoreboardId ID of the scoreboard to invite to
     * @return Created invitation
     */
    @Transactional
    public Invitation createInvitation(String receiverEmail, String scoreboardId) {
        logger.info("Creating invitation for email: {} to scoreboard: {}", receiverEmail, scoreboardId);
        
        try {
            User inviter = currentUserContext.requireCurrentUser();
            User receiver = userService.getUserByEmail(receiverEmail);
            
            //Check if user is trying to invite themselves
            if (receiver.getId().equals(inviter.getId())) {
                logger.error("User {} cannot invite themselves", inviter.getId());
                throw new IllegalArgumentException("Cannot invite yourself");
            }
            
            Optional<Scoreboard> scoreboardOpt = scoreboardService.getScoreboardById(scoreboardId);
            if (scoreboardOpt.isEmpty()) {
                logger.error("Scoreboard with ID {} not found or is inactive", scoreboardId);
                throw new IllegalArgumentException("Scoreboard not found or is inactive");
            }
            
            Scoreboard scoreboard = scoreboardOpt.get();
            
            //Verify the inviter is the creator of the scoreboard
            if (!scoreboard.getCreatedBy().equals(inviter.getId())) {
                logger.error("User {} is not the creator of the scoreboard {}", inviter.getId(), scoreboardId);
                throw new IllegalArgumentException("You can only invite users to your own scoreboards");
            }
            
            // Check if user is already a member (creator or joined)
            if (receiver.getScoreboards().contains(scoreboardId)) {
                logger.error("User {} is already a member of the scoreboard {}", receiver.getId(), scoreboardId);
                throw new IllegalArgumentException("User is already a member of this scoreboard");
            }
            
            // Check if there's already a pending invitation
            List<Invitation> invitations = getInvitationsByUserId(receiver.getId());
            if (invitations.stream().anyMatch(invitation ->
                    invitation.getScoreboardId().equals(scoreboardId) && invitation.getIsPending())) {
                logger.error("Pending invitation already exists for user {} to scoreboard {}", receiver.getId(), scoreboardId);
                throw new IllegalArgumentException("An invitation has already been sent to this user for this scoreboard");
            }
            
            // Create invitation
            Invitation invitation = new Invitation();
            invitation.setReceiverId(receiver.getId());
            invitation.setScoreboardId(scoreboardId);
            invitation.setScoreboardName(scoreboard.getName());
            invitation.setIsPending(true);

            Invitation created = mongoDBService.create(invitation);
            logger.info("Successfully created invitation with ID: {}", created.getId());
            
            return created;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating invitation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create invitation: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all invitations for a user.
     * @param userId ID of the user
     * @return List of all active invitations
     */
    public List<Invitation> getInvitationsByUserId(String userId) {
        logger.info("Fetching all invitations for user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Attempted to fetch invitations with null or empty user ID");
            return List.of();
        }
        
        try {
            Query query = new Query(Criteria.where("receiver").is(userId));
            List<Invitation> invitations = mongoDBService.find(query, Invitation.class);
            logger.info("Successfully fetched {} invitations for user: {}", invitations.size(), userId);
            return invitations;
        } catch (Exception e) {
            logger.error("Error fetching invitations for user {}: {}", userId, e.getMessage(), e);
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
            Optional<Invitation> invitation = mongoDBService.findById(invitationId, Invitation.class);
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
     * @return Updated invitation
     */
    @Transactional
    public Invitation acceptInvitation(String invitationId) {
        logger.info("Accepting invitation {}", invitationId);

        // Validate inputs
        if (invitationId == null || invitationId.trim().isEmpty()) {
            logger.error("Invitation ID cannot be null or empty");
            throw new IllegalArgumentException("Invitation ID cannot be null or empty");
        }

        try {
            Optional<Invitation> invitationOpt = getInvitationById(invitationId);

            if (invitationOpt.isEmpty()) {
                logger.error("Invitation with ID {} not found or is inactive", invitationId);
                throw new IllegalArgumentException("Invitation not found");
            }

            Invitation invitation = invitationOpt.get();

            //Verify scoreboard still exists
            Optional<Scoreboard> scoreboardOpt = scoreboardService.getScoreboardById(invitation.getScoreboardId());
            if (scoreboardOpt.isEmpty()) {
                logger.error("Scoreboard {} no longer exists", invitation.getScoreboardId());
                deleteInvitations(Set.of(invitationId));
                throw new IllegalArgumentException("Scoreboard no longer exists");
            }

            Scoreboard scoreboard = scoreboardOpt.get();

            //Add user to scoreboard
            Set<String> scoreboardUsers = scoreboard.getUsers();
            String userToAddId = invitation.getReceiverId();
            if (!scoreboardUsers.contains(userToAddId)) {
                scoreboardUsers.add(userToAddId);
                mongoDBService.update(scoreboard.getId(), Scoreboard.class, sb ->
                        sb.setUsers(scoreboardUsers));
                logger.info("Added user {} to the scoreboard {}", userToAddId, invitation.getScoreboardId());
            } else {
                logger.info("User {} has already joined the scoreboard {}", userToAddId, invitation.getScoreboardId());
                deleteInvitations(Set.of(invitationId));
                throw new IllegalArgumentException("User has already joined this scoreboard");
            }
            
            // Add scoreboard to the user
            Optional<User> userOpt = userService.getUserById(userToAddId);
            if (userOpt.isEmpty()) {
                logger.error("User {} not found", userToAddId);
                throw new IllegalArgumentException("User not found");
            }

            User user = userOpt.get();

            Set<String> userScoreboards = user.getScoreboards();
            if (!userScoreboards.contains(invitation.getScoreboardId())) {
                userScoreboards.add(invitation.getScoreboardId());
                mongoDBService.update(user.getId(), User.class, u ->
                        u.setScoreboards(userScoreboards));
                logger.info("Added scoreboard {} to the user {}", invitation.getScoreboardId(), user.getId());
            } else {
                logger.info("Scoreboard {} has already been added to the user {}",
                        invitation.getScoreboardId(), user.getId());
                deleteInvitations(Set.of(invitationId));
                throw new IllegalArgumentException("Scoreboard already added to user");
            }
            
            //Delete invitation after it's accepted
            Invitation deleted = deleteInvitations(Set.of(invitationId)).getFirst();
            logger.info("Successfully accepted invitation {}", invitationId);
            
            return deleted;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error accepting invitation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error accepting invitation {}: {}", invitationId, e.getMessage(), e);
            throw new RuntimeException("Failed to accept invitation: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete an invitation (soft delete).
     * @param ids List of invitation IDs
     * @return all the deleted invitations
     */
    @Transactional
    public List<Invitation> deleteInvitations(Set<String> ids) {
        logger.info("Deleting invitations {}", ids);

        if (ids == null || ids.isEmpty()) {
            logger.warn("Attempted to delete invitations with null or empty IDs");
            throw new IllegalArgumentException("Invitation IDs cannot be null or empty");
        }
        
        try {
            List<Invitation> deleted = mongoDBService.deleteAll(ids, Invitation.class);
            logger.info("Successfully deleted invitations: {}", ids);
            return deleted;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting invitations with IDs {}: {}", ids, e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting invitations with IDs {}: {}", ids, e.getMessage(), e);
            throw new RuntimeException("Failed to delete invitations: " + e.getMessage(), e);
        }
    }
}

