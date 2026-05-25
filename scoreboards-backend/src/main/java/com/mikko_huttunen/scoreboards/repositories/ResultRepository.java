package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.Result;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Result entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface ResultRepository extends MongoRepository<Result, String> {

    /**
     * Find all active results for a scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active results for the scoreboard
     */
    List<Result> findByScoreboardIdAndIsActiveTrue(String scoreboardId);

    /**
     * Find all active results for a specific result entry.
     * @param resultEntryId The result entry ID
     * @return List of active results for the result entry
     */
    List<Result> findByResultEntryIdAndIsActiveTrue(String resultEntryId);
    
    /**
     * Find all active results for a specific session.
     * @param sessionId The session ID
     * @return List of active results for the session
     */
    List<Result> findBySessionIdAndIsActiveTrue(String sessionId);
    
    /**
     * Find a result by ID if it's active.
     * @param id The result ID
     * @return Optional containing the result if found and active
     */
    Optional<Result> findByIdAndIsActiveTrue(String id);
}

