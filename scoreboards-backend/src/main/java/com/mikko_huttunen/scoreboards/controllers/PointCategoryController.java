package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.services.PointCategoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for PointCategory operations.
 * Provides endpoints for fetching point categories by scoreboard.
 */
@RestController
@RequestMapping("/api/point-categories")
public class PointCategoryController {
    
    private static final Logger logger = LoggerFactory.getLogger(PointCategoryController.class);
    
    private final PointCategoryService pointCategoryService;
    
    @Autowired
    public PointCategoryController(PointCategoryService pointCategoryService) {
        this.pointCategoryService = pointCategoryService;
    }
    
    /**
     * Get all active point categories for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return ResponseEntity containing a list of point categories
     */
    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<List<PointCategory>> getPointCategoriesByScoreboardId(
            @PathVariable String scoreboardId) {
        logger.info("GET /api/point-categories/scoreboard/{} - Fetching point categories", scoreboardId);

        List<PointCategory> pointCategories = pointCategoryService.getPointCategoriesByScoreboardId(scoreboardId);

        return ResponseEntity.status(HttpStatus.OK).body(pointCategories);
    }
    
    /**
     * Get a point category by ID.
     * @param id The point category ID
     * @return ResponseEntity containing the point category if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<PointCategory> getPointCategoryById(@PathVariable String id) {
        logger.info("GET /api/point-categories/{} - Fetching point category", id);

        PointCategory pointCategory = pointCategoryService.getPointCategoryById(id);

        return ResponseEntity.status(HttpStatus.OK).body(pointCategory);
    }
}

