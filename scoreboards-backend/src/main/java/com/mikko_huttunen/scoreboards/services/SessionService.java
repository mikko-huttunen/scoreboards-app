package com.mikko_huttunen.scoreboards.services;

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
import java.util.stream.Collectors;

/**
 * Service class for handling Session business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class SessionService {
    
    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

    private final ResultEntryService resultEntryService;
    private final CurrentUserContext currentUserContext;
    private final UserService userService;
    private final MongoDBService mongoDBService;
    
    @Autowired
    public SessionService(
            ResultEntryService resultEntryService,
            CurrentUserContext currentUserContext,
            UserService userService,
            MongoDBService mongoDBService) {
        this.resultEntryService = resultEntryService;
        this.currentUserContext = currentUserContext;
        this.userService = userService;
        this.mongoDBService = mongoDBService;
    }

    /**
     * Create a new session.
     * @param scoreboardId The scoreboard ID
     * @param scoreboardName The scoreboard name
     * @param participantIds List of user IDs participating in the session
     * @param pointCategoryIds List of point category IDs for the session
     * @return The created session
     */
    @Transactional
    public Session createSession(
            String scoreboardId,
            String scoreboardName,
            Set<String> participantIds,
            Set<String> pointCategoryIds) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Creating new session for scoreboard: {} by user: {}", scoreboardName, currentUser.getId());

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        if (scoreboardName == null || scoreboardName.trim().isEmpty()) {
            logger.error("Invalid scoreboard name provided: {}", scoreboardName);
            throw new IllegalArgumentException("Scoreboard name cannot be null or empty");
        }

        if (participantIds == null || participantIds.isEmpty()) {
            logger.error("Invalid participant IDs provided: {}", participantIds);
            throw new IllegalArgumentException("Participant IDs cannot be null or empty");
        }

        if (pointCategoryIds == null || pointCategoryIds.isEmpty()) {
            logger.error("Invalid point category IDs provided: {}", pointCategoryIds);
            throw new IllegalArgumentException("Point category IDs cannot be null or empty");
        }

        try {
            Set<String> allParticipantIds = new HashSet<>();

            //Verify participants exist and belong to the scoreboard
            allParticipantIds.add(currentUser.getId());
            Set<String> scoreboardUserIds = userService.getUsersForScoreboard(scoreboardId)
                    .stream().map(User::getId).collect(Collectors.toSet());
            allParticipantIds.addAll(scoreboardUserIds);

            for (String userId : participantIds) {
                if (!allParticipantIds.contains(userId)) {
                    logger.error("User {} is not a member of the scoreboard {}", userId, scoreboardId);
                    throw new IllegalArgumentException("User is not a member of this scoreboard");
                }
            }

            Session session = new Session();
            session.setScoreboardId(scoreboardId);
            session.setScoreboardName(scoreboardName);
            session.setCreatedByName(currentUser.getName());
            session.setIsPending(true);
            session.setParticipants(participantIds);
            session.setPointCategories(pointCategoryIds);
            session.setResultEntries(new HashSet<>());

            Session createdSession = mongoDBService.create(session);
            logger.info("Successfully created session with ID: {} for scoreboard: {}",
                    createdSession.getId(), scoreboardId);


            try {
                resultEntryService.createResultEntries(
                        scoreboardId,
                        createdSession.getId(),
                        participantIds
                );
                logger.info("Created result entries for session: {} with participant IDs: {}",
                        createdSession.getId(), participantIds);
            } catch (Exception e) {
                logger.error("Error creating result entries for session {} with participant IDs {}: {}",
                        createdSession.getId(), participantIds, e.getMessage(), e);
                throw new RuntimeException("Failed to create result entries", e);
            }

            return createdSession;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating session: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create session: " + e.getMessage(), e);
        }
    }

    /**
     * Get all sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of sessions
     */
    public List<Session> getSessionsByScoreboardId(String scoreboardId) {
        logger.info("Fetching sessions for scoreboard ID: {}", scoreboardId);

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        try {
            Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));
            List<Session> sessions = mongoDBService.find(query, Session.class);

            logger.info("Found {} sessions for scoreboard ID: {}", sessions.size(), scoreboardId);
            return sessions;
        } catch (Exception e) {
            logger.error("Error fetching sessions for scoreboard ID {}: {}", scoreboardId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch sessions", e);
        }
    }
    
    /**
     * Get a session by ID if it's active.
     * @param id The session ID
     * @return Optional session
     */
    public Optional<Session> getSessionById(String id) {
        logger.info("Fetching session by ID: {}", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Invalid session ID provided: {}", id);
            return Optional.empty();
        }
        
        try {
            Optional<Session> session = mongoDBService.findById(id, Session.class);
            if (session.isPresent()) {
                logger.info("Found active session with ID: {}", id);
            } else {
                logger.warn("Session with ID {} not found or not active", id);
            }
            return session;
        } catch (Exception e) {
            logger.error("Error fetching session by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch session", e);
        }
    }
    
    /**
     * Update an existing session.
     * @param id The session ID
     * @param isPending Updated isPending value
     * @param participantIds Updated list of participant IDs (optional)
     * @param pointCategoryIds Updated list of point category IDs (optional)
     * @param resultEntryIds Updated list of result entry IDs (optional)
     * @return The updated session if found
     */
    @Transactional
    public Session updateSession(
            String id,
            Boolean isPending,
            Set<String> participantIds,
            Set<String> pointCategoryIds,
            Set<String> resultEntryIds
            ) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Updating session: {} by user: {}", id, currentUser.getId());
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", id);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Optional<Session> updatedScoreboard = mongoDBService.update(id, Session.class, session -> {
                if (isPending != null) session.setIsPending(isPending);
                if (participantIds != null) session.setParticipants(participantIds);
                if (pointCategoryIds != null) session.setPointCategories(pointCategoryIds);
                if (resultEntryIds != null) session.setResultEntries(resultEntryIds);
            });

            if (updatedScoreboard.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return null;
            }

            logger.info("Successfully updated session: {}", id);
            return updatedScoreboard.get();
        } catch (IllegalArgumentException e) {
            logger.error("Validation error updating session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error updating session {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to update session: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete a session (soft delete).
     * @param ids List of session IDs
     * @return All the deleted sessions
     */
    @Transactional
    public List<Session> deleteSessions(Set<String> ids) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Deleting sessions: {} by user: {}", ids, currentUser.getId());
        
        if (ids == null || ids.isEmpty()) {
            logger.warn("Attempted to delete sessions with null or empty IDs");
            throw new IllegalArgumentException("Session IDs cannot be null or empty");
        }
        
        try {
            //Delete sessions
            List<Session> deletedSessions = mongoDBService.deleteAll(ids, Session.class);

            //Delete related result entries
            mongoDBService.deleteByQuery(
                    new Query(Criteria.where("sessionId").in(ids)), ResultEntry.class);

            //Delete related results
            mongoDBService.deleteByQuery(
                    new Query(Criteria.where("sessionId").in(ids)), Result.class);

            logger.info("Successfully deleted sessions: {}", ids);
            return deletedSessions;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting sessions with IDs {}: {}", ids, e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting sessions with IDs {}: {}", ids, e.getMessage(), e);
            throw new RuntimeException("Failed to delete sessions: " + e.getMessage(), e);
        }
    }
    
    /**
     * Finish a session by checking all participants have submitted results and updating the session.
     * @param id The session ID
     * @return The updated session if found and finished successfully
     */
    @Transactional
    public Session finishSession(String id) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Finishing session: {} by user: {}", id, currentUser.getId());
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", id);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Optional<Session> sessionOpt = getSessionById(id);
            if (sessionOpt.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return null;
            }

            Session session = sessionOpt.get();

            // Get all result entries for this session
            Query query = new Query(Criteria.where("sessionId").is(id));
            List<ResultEntry> resultEntryEntries = mongoDBService.find(query, ResultEntry.class);

            // Get all participant IDs (including creator)
            List<String> allParticipantIds = new ArrayList<>();
            allParticipantIds.add(session.getCreatedBy());
            if (session.getParticipants() != null) {
                for (String participantId : session.getParticipants()) {
                    if (!allParticipantIds.contains(participantId)) {
                        allParticipantIds.add(participantId);
                    }
                }
            }

            // Check if all participants have submitted results
            for (String participantId : allParticipantIds) {
                boolean hasSubmitted = false;
                for (ResultEntry entry : resultEntryEntries) {
                    if (entry.getUserId().equals(participantId) &&
                            entry.getResults() != null &&
                            !entry.getResults().isEmpty()) {
                        hasSubmitted = true;
                        break;
                    }
                }
                if (!hasSubmitted) {
                    logger.warn("Participant {} has not submitted results for session {}", participantId, id);
                    throw new IllegalArgumentException("All participants must submit their results before finishing the session");
                }
            }

            Optional<Session> finishedSessionOpt = mongoDBService.update(id, Session.class, s -> {
                    if (!s.getIsPending()) {
                        logger.warn("Session {} is already finished", id);
                        throw new IllegalArgumentException("Session is already finished");
                    }
                    s.setResultEntries(resultEntryEntries.stream().map(ResultEntry::getId).collect(Collectors.toSet()));
                    s.setIsPending(false);
            });

            if (finishedSessionOpt.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return null;
            }

            // Mark all result entries as not pending
            Set<String> resultEntryIds = resultEntryEntries.stream().map(ResultEntry::getId).collect(Collectors.toSet());
            mongoDBService.updateAll(resultEntryIds, ResultEntry.class, re -> re.setIsPending(false));

            logger.info("Successfully finished session: {}", id);
            return finishedSessionOpt.get();
        } catch (IllegalArgumentException e) {
            logger.error("Validation error finishing session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error finishing session {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to finish session: " + e.getMessage(), e);
        }
    }
}

