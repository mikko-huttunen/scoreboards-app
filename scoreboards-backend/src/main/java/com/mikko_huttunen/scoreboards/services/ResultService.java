package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.repositories.ResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for handling Result business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ResultService {
    
    private static final Logger logger = LoggerFactory.getLogger(ResultService.class);
    
    private final ResultRepository resultRepository;
    
    @Autowired
    public ResultService(ResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }
    
    /**
     * Create a new result.
     * @param scoreboardId The scoreboard ID
     * @param sessionId The session ID
     * @param resultEntryId The result entry ID
     * @param userId The user ID
     * @param pointCategoryId The point category ID
     * @param points The points value
     * @param createdById The ID of the user creating the result
     * @return The created result
     */
    @Transactional
    public Result createResult(
            String scoreboardId,
            String sessionId,
            String resultEntryId,
            String userId,
            String pointCategoryId,
            Double points,
            String createdById) {
        logger.info("Creating new result for session: {}, user: {}, pointCategory: {}", 
                sessionId, userId, pointCategoryId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        if (resultEntryId == null || resultEntryId.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", resultEntryId);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.error("Invalid user ID provided: {}", userId);
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        if (pointCategoryId == null || pointCategoryId.trim().isEmpty()) {
            logger.error("Invalid point category ID provided: {}", pointCategoryId);
            throw new IllegalArgumentException("Point category ID cannot be null or empty");
        }
        
        if (points == null) {
            logger.error("Invalid points provided: null");
            throw new IllegalArgumentException("Points cannot be null");
        }
        
        try {
            Date now = new Date();
            
            Result result = new Result();
            result.setId(UUID.randomUUID().toString());
            result.setScoreboardId(scoreboardId);
            result.setSessionId(sessionId);
            result.setResultEntryId(resultEntryId);
            result.setUserId(userId);
            result.setPointCategoryId(pointCategoryId);
            result.setPoints(points);
            result.setCreated(now);
            result.setLastModified(now);
            result.setCreatedBy(createdById);
            result.setIsActive(true);
            
            Result savedResult = resultRepository.save(result);
            logger.info("Successfully created result with ID: {} for session: {}, user: {}", 
                    savedResult.getId(), sessionId, userId);
            return savedResult;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating result: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating result: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create result: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all active results for a specific result entry.
     * @param resultEntryId The result entry ID
     * @return List of active results
     */
    public List<Result> getResultsByResultEntry(String resultEntryId) {
        logger.info("Fetching results for result entry: {}", resultEntryId);
        
        if (resultEntryId == null || resultEntryId.trim().isEmpty()) {
            logger.warn("Invalid result entry ID provided: {}", resultEntryId);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        try {
            List<Result> results = resultRepository.findByResultEntryIdAndIsActiveTrue(resultEntryId);
            logger.info("Found {} active results for result entry: {}", results.size(), resultEntryId);
            return results;
        } catch (Exception e) {
            logger.error("Error fetching results for result entry {}: {}", resultEntryId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch results", e);
        }
    }
    
    /**
     * Get all active results for a specific session.
     * @param sessionId The session ID
     * @return List of active results
     */
    public List<Result> getResultsBySession(String sessionId) {
        logger.info("Fetching results for session: {}", sessionId);
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.warn("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            List<Result> results = resultRepository.findBySessionIdAndIsActiveTrue(sessionId);
            logger.info("Found {} active results for session: {}", results.size(), sessionId);
            return results;
        } catch (Exception e) {
            logger.error("Error fetching results for session {}: {}", sessionId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch results", e);
        }
    }
    
    /**
     * Get a result by ID if it's active.
     * @param id The result ID
     * @return The result if found and active, null otherwise
     */
    public Result getResultById(String id) {
        logger.info("Fetching result by ID: {}", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Invalid result ID provided: {}", id);
            return null;
        }
        
        try {
            Optional<Result> result = resultRepository.findByIdAndIsActiveTrue(id);
            if (result.isPresent()) {
                logger.info("Found active result with ID: {}", id);
                return result.get();
            } else {
                logger.warn("Result with ID {} not found or not active", id);
                return null;
            }
        } catch (Exception e) {
            logger.error("Error fetching result by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result", e);
        }
    }
}

