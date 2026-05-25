package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.repositories.PointCategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service class for handling PointCategory business logic.
 * Provides methods for fetching point categories with appropriate logging and error handling.
 */
@Service
public class PointCategoryService {
    
    private static final Logger logger = LoggerFactory.getLogger(PointCategoryService.class);
    
    private final PointCategoryRepository pointCategoryRepository;
    
    @Autowired
    public PointCategoryService(PointCategoryRepository pointCategoryRepository) {
        this.pointCategoryRepository = pointCategoryRepository;
    }
    
    /**
     * Get all active point categories for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active point categories for the scoreboard
     */
    public List<PointCategory> getPointCategoriesByScoreboard(String scoreboardId) {
        logger.info("Fetching point categories for scoreboard: {}", scoreboardId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        try {
            List<PointCategory> categories = pointCategoryRepository.findByScoreboardIdAndIsActiveTrue(scoreboardId);
            logger.info("Found {} active point categories for scoreboard: {}", categories.size(), scoreboardId);
            return categories;
        } catch (Exception e) {
            logger.error("Error fetching point categories for scoreboard {}: {}", scoreboardId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch point categories", e);
        }
    }
    
    /**
     * Get a point category by ID if it's active.
     * @param id The point category ID
     * @return The point category if found and active, null otherwise
     */
    public PointCategory getPointCategoryById(String id) {
        logger.info("Fetching point category by ID: {}", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Invalid point category ID provided: {}", id);
            return null;
        }
        
        try {
            Optional<PointCategory> category = pointCategoryRepository.findByIdAndIsActiveTrue(id);
            if (category.isPresent()) {
                logger.info("Found active point category with ID: {}", id);
                return category.get();
            } else {
                logger.warn("Point category with ID {} not found or not active", id);
                return null;
            }
        } catch (Exception e) {
            logger.error("Error fetching point category by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch point category", e);
        }
    }
}

