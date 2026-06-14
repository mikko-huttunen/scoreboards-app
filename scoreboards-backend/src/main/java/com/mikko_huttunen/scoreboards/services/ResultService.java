package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.dtos.UpdateResultDTO;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.ResultRepository;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
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

/**
 * Service class for handling Result business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ResultService {
    
    private static final Logger logger = LoggerFactory.getLogger(ResultService.class);
    private final ResultRepository resultRepository;
    private final CurrentUserContext currentUserContext;
    private final MongoDBService mongoDBService;
    
    @Autowired
    public ResultService(
            ResultRepository resultRepository,
            CurrentUserContext currentUserContext,
            MongoDBService mongoDBService) {
        this.resultRepository = resultRepository;
        this.currentUserContext = currentUserContext;
        this.mongoDBService = mongoDBService;
    }
    
    /**
     * Create a new result.
     * @param resultEntryId The result entry ID
     * @param resultData The list of results to create
     * @return The created results
     */
    @Transactional
    public List<Result> createResults(
            String resultEntryId,
            String scoreboardId,
            String sessionId,
            List<UpdateResultDTO> resultData) {
        logger.info("Creating results for result entry: {}", resultEntryId);
        
        if (resultEntryId == null || resultEntryId.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", resultEntryId);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        if (resultData == null || resultData.isEmpty()) {
            logger.error("Invalid results provided: {}", resultData);
            throw new IllegalArgumentException("Results cannot be null or empty");
        }

        User currentUser = currentUserContext.requireCurrentUser();
        List<Result> resultsToCreate = new ArrayList<>();
        
        try {
            for (UpdateResultDTO resultDTO : resultData) {
                Result result = new Result();
                result.setScoreboardId(scoreboardId);
                result.setSessionId(sessionId);
                result.setResultEntryId(resultEntryId);
                result.setUserId(currentUser.getId());
                result.setPointCategoryId(resultDTO.getPointCategoryId());
                result.setPoints(resultDTO.getPoints());

                resultsToCreate.add(result);
            }

            List<Result> createdResults = mongoDBService.createMany(resultsToCreate);
            logger.info("Successfully created {} results for session: {}, user: {}",
                    createdResults.size(), sessionId, currentUser.getId());
            return createdResults;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating results: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating results: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create results: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all active results for a specific result entry.
     * @param resultEntryId The result entry ID
     * @return List of active results
     */
    public List<Result> getResultsByResultEntryId(String resultEntryId) {
        logger.info("Fetching results for result entry: {}", resultEntryId);
        
        if (resultEntryId == null || resultEntryId.trim().isEmpty()) {
            logger.warn("Invalid result entry ID provided: {}", resultEntryId);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        try {
            Query query = new Query(Criteria.where("resultEntryId").is(resultEntryId));
            List<Result> results = mongoDBService.find(query, Result.class);
            logger.info("Found {} results for result entry: {}", results.size(), resultEntryId);
            return results;
        } catch (Exception e) {
            logger.error("Error fetching results for result entry {}: {}", resultEntryId, e.getMessage(), e);
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
            Optional<Result> result = mongoDBService.findById(id, Result.class);
            if (result.isEmpty()) {
                logger.warn("Result with ID {} not found or not active", id);
                return null;
            }
            logger.info("Found active result with ID: {}", id);
            return result.get();
        } catch (Exception e) {
            logger.error("Error fetching result by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result", e);
        }
    }

    public List<Result> updateResults(
            String resultEntryId,
            List<Result> existingResults,
            List<UpdateResultDTO> updatedResultsData) {
        logger.info("Updating results for result entry: {}", resultEntryId);

        if (resultEntryId == null || resultEntryId.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", resultEntryId);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }

        if (existingResults == null || existingResults.isEmpty()) {
            logger.error("Invalid existing results provided: {}", existingResults);
            throw new IllegalArgumentException("Existing results cannot be null or empty");
        }

        if (updatedResultsData == null || updatedResultsData.isEmpty()) {
            logger.error("Invalid updated results provided: {}", updatedResultsData);
            throw new IllegalArgumentException("Updated results cannot be null or empty");
        }

        User currentUser = currentUserContext.requireCurrentUser();

        //TODO: Update results with single update call
        try {
            List<Result> updatedResults = new ArrayList<>();
            for (Result result : existingResults) {
                UpdateResultDTO update = updatedResultsData.stream().filter(dto ->
                        dto.getPointCategoryId().equals(result.getPointCategoryId()))
                .findFirst()
                .orElse(null);

                if (update == null) {
                    logger.warn("Result with point category ID {} not found in updated results",
                            result.getPointCategoryId());
                    throw new IllegalArgumentException("Result with point category ID not found in updated results");
                }

                Optional<Result> updatedResult = mongoDBService.update(result.getId(), Result.class, r ->
                        r.setPoints(update.getPoints()));
                if (updatedResult.isEmpty()) {
                    logger.warn("Result with ID {} not found or not active", result.getId());
                    throw new IllegalArgumentException("Result not found or not active");
                }

                updatedResults.add(updatedResult.get());
            }

            logger.info("Successfully updated {} results for result entry: {} of user: {}",
                    updatedResults.size(), resultEntryId, currentUser.getId());
            return updatedResults;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error updating results: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error updating results: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update results: " + e.getMessage(), e);
        }
    }
}

