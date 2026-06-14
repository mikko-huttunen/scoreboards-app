package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.repositories.PointCategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service class for handling PointCategory business logic.
 * Provides methods for fetching point categories with appropriate logging and error handling.
 */
@Service
public class PointCategoryService {
    
    private static final Logger logger = LoggerFactory.getLogger(PointCategoryService.class);

    private final MongoDBService mongoDBService;
    
    @Autowired
    public PointCategoryService(MongoDBService mongoDBService) {
        this.mongoDBService = mongoDBService;
    }

    /**
     * Creates point categories for a given scoreboard.
     * @param pointCategories List of point category DTOs to create.
     * @param scoreboardId ID of the scoreboard to associate the point categories with.
     * @return List of created point categories.
     */
    @Transactional
    public List<PointCategory> createPointCategories(List<PointCategoryDTO> pointCategories, String scoreboardId) {
        logger.info("Creating point categories for scoreboard: {}", scoreboardId);
        List<PointCategory> pointCategoriesToCreate = new ArrayList<>();

        for (PointCategoryDTO categoryData : pointCategories) {
            if (categoryData.getName() == null || categoryData.getName().trim().isEmpty()) {
                logger.warn("Skipping point category with empty name");
                continue;
            }
            if (categoryData.getColor() == null || categoryData.getColor().trim().isEmpty()) {
                logger.warn("Skipping point category with empty color");
                continue;
            }

            PointCategory pointCategory = new PointCategory();
            pointCategory.setName(categoryData.getName().trim());
            pointCategory.setColor(categoryData.getColor().trim());
            pointCategory.setScoreboardId(scoreboardId);

            pointCategoriesToCreate.add(pointCategory);
        }

        logger.info("Successfully created point categories for scoreboard: {}", scoreboardId);
        return mongoDBService.createMany(pointCategoriesToCreate);
    }
    
    /**
     * Get all active point categories for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active point categories for the scoreboard
     */
    public List<PointCategory> getPointCategoriesByScoreboardId(String scoreboardId) {
        logger.info("Fetching point categories for scoreboard: {}", scoreboardId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        try {
            Query query = Query.query(Criteria.where("scoreboardId").is(scoreboardId));
            List<PointCategory> pointCategories = mongoDBService.find(query, PointCategory.class);
            logger.info("Found {} point categories for scoreboard: {}", pointCategories.size(), scoreboardId);
            return pointCategories;
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
            Optional<PointCategory> pointCategory = mongoDBService.findById(id, PointCategory.class);
            if (pointCategory.isEmpty()) {
                logger.warn("Point category with ID {} not found or not active", id);
                return null;
            }
            logger.info("Found active point category with ID: {}", id);
            return pointCategory.get();
        } catch (Exception e) {
            logger.error("Error fetching point category by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch point category", e);
        }
    }

    /**
     * Updates a list of point categories for a given scoreboard.
     * @param pointCategories The list of point categories to update.
     * @param scoreboardId The ID of the scoreboard.
     * @return The updated list of point categories.
     */
    @Transactional
    public List<PointCategory> updatePointCategories(List<PointCategoryDTO> pointCategories, String scoreboardId) {
        logger.info("Updating point categories: {}", pointCategories);

        if (pointCategories == null || pointCategories.isEmpty()) {
            logger.warn("No point categories provided to update");
            return List.of();
        }

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        Set<String> pointCategoryIds = pointCategories.stream()
                .map(PointCategoryDTO::getId).collect(Collectors.toSet());

        List<PointCategory> updatedPointCategories = mongoDBService.updateAll(
                pointCategoryIds, PointCategory.class, pc -> {
                PointCategoryDTO pointCategoryDTO = pointCategories.stream()
                        .filter(pcDTO ->
                                pcDTO.getId().equals(pc.getId())).findFirst().orElse(null);
                if (pointCategoryDTO == null) return;
                pc.setName(pointCategoryDTO.getName().trim());
                pc.setColor(pointCategoryDTO.getColor().trim());
                pc.setScoreboardId(scoreboardId);
        });

        logger.info("Successfully updated point categories: {}", updatedPointCategories);
        return updatedPointCategories;
    }

    @Transactional
    public List<PointCategory> deletePointCategories(Set<String> pointCategoryIds) {
        logger.info("Deleting point categories: {}", pointCategoryIds);

        if (pointCategoryIds == null || pointCategoryIds.isEmpty()) {
            logger.warn("No point categories provided to delete");
            return List.of();
        }

        List<PointCategory> deletedPointCategories = mongoDBService.deleteAll(pointCategoryIds, PointCategory.class);
        logger.info("Successfully deleted point categories: {}", deletedPointCategories);
        return deletedPointCategories;
    }
}

