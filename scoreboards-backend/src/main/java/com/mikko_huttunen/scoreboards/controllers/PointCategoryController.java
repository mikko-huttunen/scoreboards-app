package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.services.PointCategoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for PointCategory operations.
 * Provides endpoints for fetching point categories by scoreboard.
 */
@RestController
@RequestMapping("/api/point-categories")
@CrossOrigin(origins = "*")
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
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("GET /api/point-categories/scoreboard/{} - Invalid scoreboard ID", scoreboardId);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            List<PointCategory> categories = pointCategoryService.getPointCategoriesByScoreboardId(scoreboardId);
            logger.info("GET /api/point-categories/scoreboard/{} - Found {} point categories", 
                    scoreboardId, categories.size());
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            logger.error("GET /api/point-categories/scoreboard/{} - Error fetching point categories: {}", 
                    scoreboardId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get a point category by ID.
     * @param id The point category ID
     * @return ResponseEntity containing the point category if found
     */
    @GetMapping("/{id}")
    public ResponseEntity<PointCategory> getPointCategoryById(@PathVariable String id) {
        logger.info("GET /api/point-categories/{} - Fetching point category", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("GET /api/point-categories/{} - Invalid point category ID", id);
            return ResponseEntity.badRequest().build();
        }
        
        try {
            PointCategory category = pointCategoryService.getPointCategoryById(id);
            if (category != null) {
                logger.info("GET /api/point-categories/{} - Found point category", id);
                return ResponseEntity.ok(category);
            } else {
                logger.warn("GET /api/point-categories/{} - Point category not found", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("GET /api/point-categories/{} - Error fetching point category: {}", 
                    id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

