package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.Scoreboard;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Repository interface for Scoreboard entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface ScoreboardRepository extends MongoRepository<Scoreboard, String> {
    
    /**
     * Find all active scoreboards.
     * @return List of active scoreboards
     */
    List<Scoreboard> findByIsActiveTrue();
    
    /**
     * Find a scoreboard by ID if it's active.
     * @param id The scoreboard ID
     * @return Optional containing the scoreboard if found and active
     */
    Optional<Scoreboard> findByIdAndIsActiveTrue(String id);

    /**
     * Find all scoreboards by scoreboard IDs if they are active.
     * @param ids Set of scoreboard IDs
     * @return List of active scoreboards
     */
    List<Scoreboard> findByIdInAndIsActiveTrue(Set<String> ids);
    
    /**
     * Find all scoreboards created by a specific user.
     * @param createdBy The user ID
     * @return List of scoreboards created by the user
     */
    List<Scoreboard> findByCreatedByAndIsActiveTrue(String createdBy);
}

