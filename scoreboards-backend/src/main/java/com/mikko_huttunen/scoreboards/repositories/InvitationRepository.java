package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.Invitation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Invitation entities.
 */
@Repository
public interface InvitationRepository extends MongoRepository<Invitation, String> {
    
    /**
     * Find all invitations for a specific receiver that are pending and active.
     * @param receiverId The ID of the user who received the invitation
     * @return List of pending active invitations
     */
    List<Invitation> findByReceiverAndIsPendingTrueAndIsActiveTrue(String receiverId);
    
    /**
     * Find all invitations for a specific receiver that are active.
     * @param receiverId The ID of the user who received the invitation
     * @return List of active invitations
     */
    List<Invitation> findByReceiverAndIsActiveTrue(String receiverId);
    
    /**
     * Find all invitations for a specific scoreboard that are active.
     * @param scoreboardId The ID of the scoreboard
     * @return List of active invitations for the scoreboard
     */
    List<Invitation> findByScoreboardIdAndIsActiveTrue(String scoreboardId);
    
    /**
     * Find an invitation by ID that is active.
     * @param id The invitation ID
     * @return Optional invitation if found and active
     */
    Optional<Invitation> findByIdAndIsActiveTrue(String id);
    
    /**
     * Check if an active pending invitation exists for a receiver and scoreboard.
     * @param receiverId The ID of the user who received the invitation
     * @param scoreboardId The ID of the scoreboard
     * @return true if such an invitation exists
     */
    boolean existsByReceiverAndScoreboardIdAndIsPendingTrueAndIsActiveTrue(String receiverId, String scoreboardId);
}

