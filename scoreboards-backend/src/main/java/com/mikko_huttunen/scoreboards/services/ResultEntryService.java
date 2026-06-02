package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.repositories.ResultEntryRepository;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for handling ResultEntry business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ResultEntryService {
    
    private static final Logger logger = LoggerFactory.getLogger(ResultEntryService.class);

    private final ResultService resultService;
    private final MongoDBService mongoDBService;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public ResultEntryService(
            ResultEntryRepository resultEntryRepository,
            ResultService resultService, MongoDBService mongoDBService, CurrentUserContext currentUserContext) {
        this.resultService = resultService;
        this.mongoDBService = mongoDBService;
        this.currentUserContext = currentUserContext;
    }

    /**
     * Create a new result entry.
     * @param scoreboardId The scoreboard ID
     * @param sessionId The session ID
     * @param userIds The set of user IDs
     * @return The created result entry
     */
    @Transactional
    public List<ResultEntry> createResultEntries(
            String scoreboardId,
            String sessionId,
            Set<String> userIds) {
        logger.info("Creating new result entries for session: {}", sessionId);

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        if (userIds == null || userIds.isEmpty()) {
            logger.error("Invalid user IDs provided: {}", userIds);
            throw new IllegalArgumentException("User IDs cannot be null or empty");
        }

        try {
            List<ResultEntry> resultEntriesToCreate = new ArrayList<>();

            for (String userId : userIds) {
                ResultEntry resultEntry = new ResultEntry();
                resultEntry.setScoreboardId(scoreboardId);
                resultEntry.setSessionId(sessionId);
                resultEntry.setUserId(userId);
                resultEntry.setResults(new HashSet<>());

                resultEntriesToCreate.add(resultEntry);
            }

            List<ResultEntry> createdResultEntries = mongoDBService.createMany(resultEntriesToCreate);
            logger.info("Successfully created {} new result entries for session: {}",
                    createdResultEntries.size(), sessionId);
            return createdResultEntries;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating result entries: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating result entries: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create result entries: " + e.getMessage(), e);
        }
    }

    /**
     * Get all active result entries for a specific session.
     * @param sessionId The session ID
     * @return List of active result entries
     */
    public List<ResultEntry> getResultEntriesBySession(String sessionId) {
        logger.info("Fetching result entries for session: {}", sessionId);
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.warn("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Query query = new Query(Criteria.where("sessionId").is(sessionId));
            List<ResultEntry> entries = mongoDBService.find(query, ResultEntry.class);
            logger.info("Found {} active result entries for session: {}", entries.size(), sessionId);
            return entries;
        } catch (Exception e) {
            logger.error("Error fetching result entries for session {}: {}", sessionId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entries", e);
        }
    }
    
    /**
     * Get all active result entries for a specific user.
     * @param userId The user ID
     * @return List of active result entries
     */
    public List<ResultEntry> getResultEntriesByUser(String userId) {
        logger.info("Fetching result entries for user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Invalid user ID provided: {}", userId);
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        try {
            Query query = new Query(Criteria.where("userId").is(userId));
            List<ResultEntry> entries = mongoDBService.find(query, ResultEntry.class);
            logger.info("Found {} active result entries for user: {}", entries.size(), userId);
            return entries;
        } catch (Exception e) {
            logger.error("Error fetching result entries for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entries", e);
        }
    }
    
    /**
     * Get a result entry by ID if it's active.
     * @param id The result entry ID
     * @return The result entry if found and active, null otherwise
     */
    public ResultEntry getResultEntryById(String id) {
        logger.info("Fetching result entry by ID: {}", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Invalid result entry ID provided: {}", id);
            return null;
        }
        
        try {
            Optional<ResultEntry> entry = mongoDBService.findById(id, ResultEntry.class);
            if (entry.isEmpty()) {
                logger.warn("Result entry with ID {} not found or not active", id);
                return null;
            }
            logger.info("Found active result entry with ID: {}", id);
            return entry.get();
        } catch (Exception e) {
            logger.error("Error fetching result entry by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entry", e);
        }
    }
    
    /**
     * Update an existing result entry with results.
     * @param resultEntryId The result entry ID
     * @param results List of updated results to associate with this entry
     * @return The updated result entry if found
     */
    @Transactional
    public ResultEntry updateResultEntry(
            String resultEntryId,
            String scoreboardId,
            String sessionId,
            List<UpdateResultDTO> results) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Updating result entry: {} by user: {}", resultEntryId, currentUser.getId());
        
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

        if (results == null || results.isEmpty()) {
            logger.error("Invalid updated results provided: {}", results);
            throw new IllegalArgumentException("Updated results cannot be null or empty");
        }
        
        try {
            List<Result> resultsToUpdate;
            //Calculate total points from all results
            List<Result> existingResults = resultService.getResultsByResultEntryId(resultEntryId);
            if (!existingResults.isEmpty()) {
                resultsToUpdate = resultService.updateResults(resultEntryId, existingResults, results);
            } else {
                resultsToUpdate = resultService.createResults(resultEntryId, scoreboardId, sessionId, results);
            }

            if (resultsToUpdate == null) {
                logger.warn("Result entry {} not found or is inactive", resultEntryId);
                return null;
            }

            double totalPoints = 0.0;

            for (Result result : resultsToUpdate) {
                try {
                    totalPoints += result.getPoints();
                } catch (Exception e) {
                    logger.error("Error calculating total points for result: {}", result.getId(), e);
                    throw new RuntimeException("Failed to calculate total points", e);
                }
            }

            double finalTotalPoints = totalPoints;
            Optional<ResultEntry> updatedEntryOpt = mongoDBService.update(
                    resultEntryId, ResultEntry.class, entry -> {
                        entry.setIsPending(false);
                        entry.setResults(resultsToUpdate.stream().map(Result::getId).collect(Collectors.toSet()));
                        entry.setTotalPoints(finalTotalPoints);
                    });

            if (updatedEntryOpt.isEmpty()) {
                logger.warn("Result entry {} not found or is inactive", resultEntryId);
                return null;
            }

            ResultEntry updatedEntry = updatedEntryOpt.get();
            logger.info("Successfully updated result entry: {} with total points: {}",
                    resultEntryId, updatedEntry.getTotalPoints());
            return updatedEntry;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error updating result entry: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error updating result entry {}: {}", resultEntryId, e.getMessage(), e);
            throw new RuntimeException("Failed to update result entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The result entry ID
     * @return Deleted result entry or null if not found
     */
    @Transactional
    public ResultEntry deleteResultEntry(String id) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Deleting result entry: {} by user: {}", id, currentUser.getId());
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", id);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        try {
            //Delete results associated with this result entry
            Query query = new Query(Criteria.where("resultEntryId").is(id));
            mongoDBService.deleteByQuery(query, Result.class);

            //Delete result entry
            ResultEntry deleted = mongoDBService.deleteById(id, ResultEntry.class);
            if (deleted == null) {
                logger.warn("Result entry {} not found or is inactive", id);
                throw new IllegalArgumentException("Result entry not found");
            }

            logger.info("Successfully deleted result entry: {}", id);
            return deleted;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting result entry: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting result entry {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to delete result entry: " + e.getMessage(), e);
        }
    }
}

