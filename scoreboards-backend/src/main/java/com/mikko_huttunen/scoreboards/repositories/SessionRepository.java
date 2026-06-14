package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Session entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface SessionRepository extends MongoRepository<Session, String> {

    /**
     * Find all active sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active sessions for the scoreboard
     */
    List<Session> findByScoreboardIdAndIsActiveTrue(String scoreboardId);

    /**
     * Find all active non-pending sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active non-pending sessions for the scoreboard
     */
    List<Session> findByScoreboardIdAndIsPendingFalseAndIsActiveTrue(String scoreboardId);

    /**
     * Find a session by ID if it's active.
     * @param id The session ID
     * @return Optional containing the session if found and active
     */
    Optional<Session> findByIdAndIsActiveTrue(String id);
    
    /**
     * Find all pending sessions for a specific user (where user is a participant or creator).
     * Note: This query checks participants list, but creator should also be included.
     * We'll need to handle creator separately in the service.
     * @param userId The user ID
     * @return List of pending sessions for the user
     */
    List<Session> findByParticipantsContainingAndIsPendingTrueAndIsActiveTrue(String userId);
    
    /**
     * Find all pending sessions created by a specific user.
     * @param createdBy The creator user ID
     * @return List of pending sessions created by the user
     */
    List<Session> findByCreatedByAndIsPendingTrueAndIsActiveTrue(String createdBy);
}

