package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.repositories.ResultEntryRepository;
import com.mikko_huttunen.scoreboards.repositories.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service class for handling ResultEntry business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ResultEntryService {
    
    private static final Logger logger = LoggerFactory.getLogger(ResultEntryService.class);
    
    private final ResultEntryRepository resultEntryRepository;
    private final SessionRepository sessionRepository;
    private final ResultService resultService;
    
    @Autowired
    public ResultEntryService(
            ResultEntryRepository resultEntryRepository,
            SessionRepository sessionRepository,
            ResultService resultService) {
        this.resultEntryRepository = resultEntryRepository;
        this.sessionRepository = sessionRepository;
        this.resultService = resultService;
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
            List<ResultEntry> entries = resultEntryRepository.findBySessionIdAndIsActiveTrue(sessionId);
            logger.info("Found {} active result entries for session: {}", entries.size(), sessionId);
            return entries;
        } catch (Exception e) {
            logger.error("Error fetching result entries for session {}: {}", sessionId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entries", e);
        }
    }
    
    /**
     * Get a result entry by session ID and user ID.
     * @param sessionId The session ID
     * @param userId The user ID
     * @return The result entry if found and active, null otherwise
     */
    public ResultEntry getResultEntryBySessionAndUser(String sessionId, String userId) {
        logger.info("Fetching result entry for session: {} and user: {}", sessionId, userId);
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.warn("Invalid session ID provided: {}", sessionId);
            return null;
        }
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Invalid user ID provided: {}", userId);
            return null;
        }
        
        try {
            Optional<ResultEntry> entry = resultEntryRepository.findBySessionIdAndUserIdAndIsActiveTrue(sessionId, userId);
            if (entry.isPresent()) {
                logger.info("Found active result entry for session: {} and user: {}", sessionId, userId);
                return entry.get();
            } else {
                logger.warn("Result entry for session {} and user {} not found or not active", sessionId, userId);
                return null;
            }
        } catch (Exception e) {
            logger.error("Error fetching result entry for session {} and user {}: {}", sessionId, userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entry", e);
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
            List<ResultEntry> entries = resultEntryRepository.findByUserIdAndIsActiveTrue(userId);
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
            Optional<ResultEntry> entry = resultEntryRepository.findByIdAndIsActiveTrue(id);
            if (entry.isPresent()) {
                logger.info("Found active result entry with ID: {}", id);
                return entry.get();
            } else {
                logger.warn("Result entry with ID {} not found or not active", id);
                return null;
            }
        } catch (Exception e) {
            logger.error("Error fetching result entry by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch result entry", e);
        }
    }
    
    /**
     * Create a new result entry.
     * @param scoreboardId The scoreboard ID
     * @param sessionId The session ID
     * @param userId The user ID
     * @param createdById The ID of the user creating the result entry
     * @return The created result entry
     */
    @Transactional
    public ResultEntry createResultEntry(
            String scoreboardId,
            String sessionId,
            String userId,
            String createdById) {
        logger.info("Creating new result entry for session: {} and user: {}", sessionId, userId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        if (sessionId == null || sessionId.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", sessionId);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.error("Invalid user ID provided: {}", userId);
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        // Check if result entry already exists
        Optional<ResultEntry> existing = resultEntryRepository.findBySessionIdAndUserIdAndIsActiveTrue(sessionId, userId);
        if (existing.isPresent()) {
            logger.warn("Result entry already exists for session: {} and user: {}", sessionId, userId);
            throw new IllegalArgumentException("Result entry already exists for this session and user");
        }
        
        // Verify session exists
        Optional<Session> sessionOpt = sessionRepository.findByIdAndIsActiveTrue(sessionId);
        if (sessionOpt.isEmpty()) {
            logger.error("Session {} not found or is inactive", sessionId);
            throw new IllegalArgumentException("Session not found or is inactive");
        }
        
        try {
            Date now = new Date();
            
            ResultEntry resultEntry = new ResultEntry();
            resultEntry.setId(UUID.randomUUID().toString());
            resultEntry.setScoreboardId(scoreboardId);
            resultEntry.setSessionId(sessionId);
            resultEntry.setUserId(userId);
            resultEntry.setResults(new ArrayList<>());
            resultEntry.setCreated(now);
            resultEntry.setLastModified(now);
            resultEntry.setCreatedBy(createdById);
            resultEntry.setIsActive(true);
            
            ResultEntry savedEntry = resultEntryRepository.save(resultEntry);
            logger.info("Successfully created result entry with ID: {} for session: {} and user: {}", 
                    savedEntry.getId(), sessionId, userId);
            return savedEntry;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating result entry: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating result entry: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create result entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update an existing result entry with results.
     * @param id The result entry ID
     * @param resultIds List of result IDs to associate with this entry
     * @param userId The ID of the user updating the result entry
     * @return The updated result entry if found
     */
    @Transactional
    public ResultEntry updateResultEntry(String id, List<String> resultIds, String userId) {
        logger.info("Updating result entry: {} by user: {}", id, userId);
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", id);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        try {
            Optional<ResultEntry> entryOpt = resultEntryRepository.findByIdAndIsActiveTrue(id);
            if (entryOpt.isEmpty()) {
                logger.warn("Result entry {} not found or is inactive", id);
                return null;
            }
            
            ResultEntry entry = entryOpt.get();
            
            // Only the user who owns the result entry can update it
            if (!entry.getUserId().equals(userId)) {
                logger.error("User {} is not authorized to update result entry {}", userId, id);
                throw new IllegalArgumentException("Only the owner can update their result entry");
            }
            
            if (resultIds != null) {
                entry.setResults(new ArrayList<>(resultIds));
                
                // Calculate total points from all results
                double totalPoints = 0.0;
                for (String resultId : resultIds) {
                    try {
                        com.mikko_huttunen.scoreboards.models.Result result = resultService.getResultById(resultId);
                        if (result != null && result.getIsActive()) {
                            totalPoints += result.getPoints() != null ? result.getPoints() : 0.0;
                        }
                    } catch (Exception e) {
                        logger.warn("Error fetching result {} for total points calculation: {}", resultId, e.getMessage());
                    }
                }
                entry.setTotalPoints(totalPoints);
            }
            
            entry.setLastModified(new Date());
            ResultEntry updatedEntry = resultEntryRepository.save(entry);
            logger.info("Successfully updated result entry: {} with total points: {}", id, updatedEntry.getTotalPoints());
            return updatedEntry;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error updating result entry: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error updating result entry {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to update result entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The result entry ID
     * @param userId The ID of the user deleting the result entry
     * @return True if deleted, false if not found
     */
    @Transactional
    public boolean deleteResultEntry(String id, String userId) {
        logger.info("Deleting result entry: {} by user: {}", id, userId);
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid result entry ID provided: {}", id);
            throw new IllegalArgumentException("Result entry ID cannot be null or empty");
        }
        
        try {
            Optional<ResultEntry> entryOpt = resultEntryRepository.findByIdAndIsActiveTrue(id);
            if (entryOpt.isEmpty()) {
                logger.warn("Result entry {} not found or is inactive", id);
                return false;
            }
            
            ResultEntry entry = entryOpt.get();
            
            // Only the user who owns the result entry can delete it
            if (!entry.getUserId().equals(userId)) {
                logger.error("User {} is not authorized to delete result entry {}", userId, id);
                throw new IllegalArgumentException("Only the owner can delete their result entry");
            }
            
            entry.setIsActive(false);
            entry.setLastModified(new Date());
            resultEntryRepository.save(entry);
            logger.info("Successfully deleted result entry: {}", id);
            return true;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting result entry: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting result entry {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to delete result entry: " + e.getMessage(), e);
        }
    }
}

