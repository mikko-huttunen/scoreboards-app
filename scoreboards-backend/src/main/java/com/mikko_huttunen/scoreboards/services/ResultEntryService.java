package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.UpdateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
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

    private final QueryService queryService;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public ResultEntryService(
            QueryService queryService,
            CurrentUserContext currentUserContext) {
        this.queryService = queryService;
        this.currentUserContext = currentUserContext;
    }

    /**
     * Create a new result entry.
     * @param dto The DTO containing result entry data
     * @return The created result entry
     */
    @Transactional
    public ResultEntry createResultEntry(UpdateResultEntryDTO dto) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Creating result entry for session: {}, for user: {}", dto.getSessionId(), currentUser.getId());

        Optional<Session> sessionOpt = queryService.findById(dto.getSessionId(), Session.class, true);
        Session session = sessionOpt.orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (!session.getIsPending() || !session.getIsActive()) {
            throw new IllegalArgumentException("Session is finished or deleted");
        }

        Set<String> participants = session.getParticipants();
        if (!participants.contains(currentUser.getId())) {
            throw new IllegalArgumentException("User is not a participant of this session");
        }

        ResultEntry resultEntry = new ResultEntry();
        resultEntry.setScoreboardId(dto.getScoreboardId());
        resultEntry.setSessionId(dto.getSessionId());
        resultEntry.setUserId(currentUser.getId());
        resultEntry.setResults(dto.getResults());
        resultEntry.setTotalPoints(dto.getTotalPoints());

        ResultEntry createdResultEntry = queryService.create(resultEntry);

        logger.info("Successfully created result entry for session: {}, for user: {}",
                dto.getSessionId(), currentUser.getId());
        return createdResultEntry;
    }

    /**
     * Get all result entries associated with a specific scoreboard.
     * @param scoreboardId The ID of the scoreboard.
     * @return A list of result entries.
     */
    public List<ResultEntry> getResultEntriesByScoreboard(String scoreboardId) {
        logger.info("Fetching result entries for scoreboard: {}", scoreboardId);

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        List<ResultEntry> resultEntries = queryService.find(query, ResultEntry.class, false);

        logger.info("Found {} result entries for scoreboard: {}", resultEntries.size(), scoreboardId);
        return resultEntries;
    }
    
    /**
     * Get all active result entries for a specific user.
     * @param userId The user ID
     * @return List of result entries
     */
    public List<ResultEntry> getResultEntriesByUser(String userId) {
        logger.info("Fetching result entries for user: {}", userId);

        Query query = new Query(Criteria.where("userId").is(userId));
        List<ResultEntry> entries = queryService.find(query, ResultEntry.class, false);

        logger.info("Found {} result entries for user: {}", entries.size(), userId);
        return entries;
    }
    
    /**
     * Get a result entry by ID if it's active.
     * @param id The result entry ID
     * @return The result entry if found
     */
    public ResultEntry getResultEntryById(String id) {
        logger.info("Fetching result entry by ID: {}", id);

        Optional<ResultEntry> resultEntryOpt = queryService.findById(id, ResultEntry.class, false);
        ResultEntry resultEntry = resultEntryOpt.orElseThrow(() ->
                new IllegalArgumentException("Result entry not found"));

        logger.info("Found result entry with ID: {}", resultEntry.getId());
        return resultEntry;
    }
    
    /**
     * Update an existing result entry with results.
     * @param resultEntryId The result entry ID
     * @param dto The updated result entry data
     * @return The updated result entry if found
     */
    @Transactional
    public ResultEntry updateResultEntry(
            String resultEntryId,
            UpdateResultEntryDTO dto) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Updating result entry: {} by user: {}", resultEntryId, currentUser.getId());

        Optional<Session> sessionOpt = queryService.findById(dto.getSessionId(), Session.class, true);
        Session session = sessionOpt.orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (!session.getIsPending() || !session.getIsActive()) {
            throw new IllegalArgumentException("Session is finished or deleted");
        }

        Set<String> participants = session.getParticipants();
        if (!participants.contains(currentUser.getId())) {
            throw new IllegalArgumentException("User is not a participant of this session");
        }

        Set<Result> results = dto.getResults();

        double totalPoints = 0.0;

        for (Result result : results) {
            totalPoints += result.getPoints();
        }

        double finalTotalPoints = totalPoints;

        Optional<ResultEntry> updatedResultEntryOpt = queryService.updateById(
                resultEntryId, ResultEntry.class, entry -> {
                    entry.setIsPending(false);
                    entry.setResults(results);
                    entry.setTotalPoints(finalTotalPoints);
                });

        ResultEntry updatedResultEntry = updatedResultEntryOpt.orElseThrow(() ->
                new IllegalArgumentException("Result entry not found"));

        logger.info("Successfully updated result entry: {}", updatedResultEntry.getId());
        return updatedResultEntry;
    }
    
    /**
     * Delete a result entry (soft delete).
     * @param id The result entry ID
     * @return Deleted result entry
     */
    @Transactional
    public ResultEntry deleteResultEntry(String id) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Deleting result entry: {} by user: {}", id, currentUser.getId());

        ResultEntry deleted = queryService.deleteById(id, ResultEntry.class);

        logger.info("Successfully deleted result entry: {}", id);
        return deleted;
    }
}

