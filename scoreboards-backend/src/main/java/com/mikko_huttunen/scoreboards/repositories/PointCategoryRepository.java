package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.PointCategory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for PointCategory entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface PointCategoryRepository extends MongoRepository<PointCategory, String> {
    
    /**
     * Find all active point categories for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active point categories for the scoreboard
     */
    List<PointCategory> findByScoreboardIdAndIsActiveTrue(String scoreboardId);
    
    /**
     * Find a point category by ID if it's active.
     * @param id The point category ID
     * @return Optional containing the point category if found and active
     */
    Optional<PointCategory> findByIdAndIsActiveTrue(String id);
}

