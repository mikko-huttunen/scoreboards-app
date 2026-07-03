package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.models.PointCategory;
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

    private final QueryService queryService;
    
    @Autowired
    public PointCategoryService(QueryService queryService) {
        this.queryService = queryService;
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
            PointCategory pointCategory = new PointCategory();
            pointCategory.setName(categoryData.getName().trim());
            pointCategory.setColor(categoryData.getColor().trim());
            pointCategory.setScoreboardId(scoreboardId);

            pointCategoriesToCreate.add(pointCategory);
        }

        List<PointCategory> createdPointCategories = queryService.create(pointCategoriesToCreate);

        logger.info("Successfully created {} point categories for scoreboard: {}",
                createdPointCategories.size(), scoreboardId);
        return createdPointCategories;
    }
    
    /**
     * Get all active point categories for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of active point categories for the scoreboard
     */
    public List<PointCategory> getPointCategoriesByScoreboardId(String scoreboardId) {
        logger.info("Fetching point categories for scoreboard: {}", scoreboardId);

        Query query = Query.query(Criteria.where("scoreboardId").is(scoreboardId));
        List<PointCategory> pointCategories = queryService.find(query, PointCategory.class, false);

        logger.info("Found {} point categories for scoreboard: {}", pointCategories.size(), scoreboardId);
        return pointCategories;
    }
    
    /**
     * Get a point category by ID if it's active.
     * @param id The point category ID
     * @return The point category if found and active, null otherwise
     */
    public PointCategory getPointCategoryById(String id) {
        logger.info("Fetching point category by ID: {}", id);

        Optional<PointCategory> pointCategoryOpt = queryService.findById(id, PointCategory.class, false);
        PointCategory pointCategory = pointCategoryOpt.orElseThrow(() ->
                new IllegalArgumentException("Point category not found"));

        logger.info("Found point category with ID: {}", pointCategory.getId());
        return pointCategory;
    }

    /**
     * Updates a list of point categories for a given scoreboard.
     * @param pointCategories The list of point categories to update.
     * @param scoreboardId The ID of the scoreboard.
     * @return The updated list of point categories.
     */
    @Transactional
    public List<PointCategory> updatePointCategories(List<PointCategoryDTO> pointCategories, String scoreboardId) {
        logger.info("Updating point categories: {} for scoreboard: {}", pointCategories, scoreboardId);

        Set<String> pointCategoryIds = pointCategories.stream()
                .map(PointCategoryDTO::getId).collect(Collectors.toSet());

        List<PointCategory> updatedPointCategories = queryService.updateAll(
                pointCategoryIds, PointCategory.class, pc -> {
                PointCategoryDTO pointCategoryDTO = pointCategories.stream()
                        .filter(pcDTO ->
                                pcDTO.getId().equals(pc.getId())).findFirst().orElse(null);
                if (pointCategoryDTO == null) return;
                pc.setName(pointCategoryDTO.getName().trim());
                pc.setColor(pointCategoryDTO.getColor().trim());
                pc.setScoreboardId(scoreboardId);
        });

        logger.info("Successfully updated point categories: {} for scoreboard: {}",
                updatedPointCategories, scoreboardId);
        return updatedPointCategories;
    }

    /**
     * Delete point categories (soft delete).
     * @param pointCategoryIds List of point category IDs to delete
     * @return Deleted point categories
     */
    @Transactional
    public List<PointCategory> deletePointCategories(Set<String> pointCategoryIds) {
        logger.info("Deleting point categories: {}", pointCategoryIds);

        List<PointCategory> deletedPointCategories = queryService.deleteAll(pointCategoryIds, PointCategory.class);

        logger.info("Successfully deleted point categories: {}", deletedPointCategories);
        return deletedPointCategories;
    }
}

