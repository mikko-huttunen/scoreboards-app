package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.ResultEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for ResultEntry entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface ResultEntryRepository extends MongoRepository<ResultEntry, String> {

    /**
     * Find all active result entries for a scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active result entries for the scoreboard
     */
    List<ResultEntry> findByScoreboardIdAndIsActiveTrue(String scoreboardId);

    /**
     * Find all active result entries for a specific session.
     * @param sessionId The session ID
     * @return List of active result entries for the session
     */
    List<ResultEntry> findBySessionIdAndIsActiveTrue(String sessionId);
    
    /**
     * Find a result entry by session ID and user ID if it's active.
     * @param sessionId The session ID
     * @param userId The user ID
     * @return Optional containing the result entry if found and active
     */
    Optional<ResultEntry> findBySessionIdAndUserIdAndIsActiveTrue(String sessionId, String userId);
    
    /**
     * Find all active result entries for a specific user.
     * @param userId The user ID
     * @return List of active result entries for the user
     */
    List<ResultEntry> findByUserIdAndIsActiveTrue(String userId);
    
    /**
     * Find a result entry by ID if it's active.
     * @param id The result entry ID
     * @return Optional containing the result entry if found and active
     */
    Optional<ResultEntry> findByIdAndIsActiveTrue(String id);
}

