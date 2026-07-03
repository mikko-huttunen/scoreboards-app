package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.springframework.data.mongodb.core.query.Criteria.where;

/**
 * Service class for handling Invitation business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class InvitationService {
    
    private static final Logger logger = LoggerFactory.getLogger(InvitationService.class);

    private final QueryService queryService;
    private final ScoreboardService scoreboardService;
    private final CurrentUserContext currentUserContext;
    private final UserRepository userRepository;
    
    @Autowired
    public InvitationService(QueryService queryService,
                             ScoreboardService scoreboardService,
                             CurrentUserContext currentUserContext,
                             UserRepository userRepository) {
        this.queryService = queryService;
        this.scoreboardService = scoreboardService;
        this.currentUserContext = currentUserContext;
        this.userRepository = userRepository;
    }
    
    /**
     * Create a new invitation.
     * @param receiverEmail Email of the user to invite
     * @param scoreboardId ID of the scoreboard to invite to
     * @return Created invitation
     */
    @Transactional
    public Invitation createInvitation(String receiverEmail, String scoreboardId, Set<Permission> permissions) {
        User inviter = currentUserContext.requireCurrentUser();
        logger.info("Creating invitation for email: {} to scoreboard: {} by: {}", receiverEmail, scoreboardId, inviter.getId());

        Optional<User> receiverOpt = userRepository.findByEmailAndIsActiveTrue(receiverEmail);
        User receiver = receiverOpt.orElseThrow(() ->
                new IllegalArgumentException("User with email " + receiverEmail + " not found"));

        //Check if user is trying to invite themselves
        if (receiver.getId().equals(inviter.getId())) {
            logger.error("User {} cannot invite themselves", inviter.getId());
            throw new IllegalArgumentException("Cannot invite yourself");
        }

        Scoreboard scoreboard = scoreboardService.getScoreboardById(scoreboardId);

        //Verify the inviter is the creator of the scoreboard
        if (!scoreboard.getCreatedBy().equals(inviter.getId())) {
            logger.error("User {} is not the creator of the scoreboard {}", inviter.getId(), scoreboardId);
            throw new IllegalArgumentException("You are not authorized to invite users to this scoreboard");
        }

        // Check if user is already a member (creator or joined)
        if (scoreboard.getMemberships().stream().map(Membership::getUserId)
                .anyMatch(userId -> userId.equals(receiver.getId()))) {
            logger.error("User {} is already a member of the scoreboard {}", receiver.getId(), scoreboardId);
            throw new IllegalArgumentException("User is already a member of this scoreboard");
        }

        // Check if there's already a pending invitation
        List<Invitation> invitations = getInvitationsByUserId(receiver.getId());
        if (invitations.stream().anyMatch(invitation ->
                invitation.getScoreboardId().equals(scoreboardId))) {
            logger.error("Pending invitation already exists for user {} to scoreboard {}", receiver.getId(), scoreboardId);
            throw new IllegalArgumentException("An invitation has already been sent to this user for this scoreboard");
        }

        Invitation invitation = new Invitation();
        invitation.setReceiverId(receiver.getId());
        invitation.setScoreboardId(scoreboardId);
        invitation.setScoreboardName(scoreboard.getName());
        invitation.setPermissions(permissions);

        Invitation createdInvitation = queryService.create(invitation);

        //Inviter name can change so we do not save it in the invitation
        createdInvitation.setReceiverName(receiver.getName());

        logger.info("Successfully created invitation with ID: {}", createdInvitation.getId());
        return createdInvitation;
    }

    /**
     * Get all invitations of a user.
     * @param userId ID of the user
     * @return List of invitations
     */
    public List<Invitation> getInvitationsByUserId(String userId) {
        logger.info("Fetching invitations for user: {}", userId);

        List<Invitation> invitations = queryService.fetchInvitationsWithResolvedUserNames(userId);

        logger.info("Successfully fetched {} invitations for user: {}", invitations.size(), userId);
        return invitations;
    }
    
    /**
     * Get invitation by ID.
     * @param invitationId ID of the invitation
     * @return The invitation if found
     */
    public Invitation getInvitationById(String invitationId) {
        logger.info("Fetching invitation with ID: {}", invitationId);

        Optional<Invitation> invitationOpt = queryService.findById(invitationId, Invitation.class, false);
        Invitation invitation = invitationOpt.orElseThrow(() ->
                new IllegalArgumentException("Invitation not found"));

        logger.info("Found invitation with ID: {}", invitation.getId());
        return invitation;
    }
    
    /**
     * Accept an invitation.
     * @param invitationId ID of the invitation
     * @return The accepted invitation
     */
    @Transactional
    public Invitation acceptInvitation(String invitationId) {
        logger.info("Accepting invitation {}", invitationId);

        try {
            Invitation invitation = getInvitationById(invitationId);

            User user = currentUserContext.requireCurrentUser();

            Membership membership = new Membership();
            membership.setScoreboardId(invitation.getScoreboardId());
            membership.setUserId(invitation.getReceiverId());
            membership.setPermissions(invitation.getPermissions());

            boolean userHasMembership = user.getMemberships().stream().anyMatch(ms ->
                    ms.getScoreboardId().equals(invitation.getScoreboardId()));

            if (userHasMembership) {
                logger.error("User {} already has a membership to the scoreboard {}",
                        user.getId(), invitation.getScoreboardId());
                deleteInvitations(Set.of(invitationId));
                throw new IllegalArgumentException("User is already a member of this scoreboard");
            }

            queryService.create(membership);

            //Delete invitation after it's accepted
            Invitation deletedInvitation = deleteInvitations(Set.of(invitationId)).getFirst();

            logger.info("Successfully accepted invitation {}", deletedInvitation.getId());
            return deletedInvitation;
        } catch (IllegalArgumentException e) {
            logger.error("Failed to accept invitation {}", invitationId, e);
            deleteInvitations(Set.of(invitationId));
            throw new IllegalArgumentException("Failed to accept invitation", e);
        }
    }
    
    /**
     * Delete an invitation (soft delete).
     * @param ids List of invitation IDs
     * @return All the deleted invitations
     */
    @Transactional
    public List<Invitation> deleteInvitations(Set<String> ids) {
        logger.info("Deleting invitations {}", ids);

        List<Invitation> deletedInvitations = queryService.deleteAll(ids, Invitation.class);

        logger.info("Successfully deleted invitations: {}", deletedInvitations);
        return deletedInvitations;
    }
}

