package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
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

    private final CurrentUserContext currentUserContext;
    private final QueryService queryService;
    
    @Autowired
    public SessionService(
            CurrentUserContext currentUserContext,
            QueryService queryService) {
        this.currentUserContext = currentUserContext;
        this.queryService = queryService;
    }

    /**
     * Create a new session.
     * @param scoreboardId The scoreboard ID
     * @param sessionName The name of the session
     * @param comment Optional comment for the session
     * @param participantIds List of user IDs participating in the session
     * @param pointCategoryIds List of point category IDs for the session
     * @return The created session
     */
    @Transactional
    public Session createSession(
            String scoreboardId,
            String sessionName,
            String comment,
            Set<String> participantIds,
            Set<String> pointCategoryIds) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Creating new session for scoreboard: {} by user: {}", scoreboardId, currentUser.getId());


        //Verify participants exist and belong to the scoreboard
        Query scoreboardUsersQuery = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        List<Membership> memberships = queryService.find(scoreboardUsersQuery, Membership.class, false);
        Set<String> scoreboardUserIds = memberships.stream().map(Membership::getUserId).collect(Collectors.toSet());

        for (String userId : participantIds) {
            if (!scoreboardUserIds.contains(userId)) {
                logger.error("User {} is not a member of the scoreboard {}", userId, scoreboardId);
                throw new IllegalArgumentException("User is not a member of this scoreboard");
            }
        }

        Session session = new Session();
        session.setScoreboardId(scoreboardId);
        session.setName(sessionName);
        session.setComment(comment);
        session.setIsPending(true);
        session.setParticipants(participantIds);
        session.setPointCategories(pointCategoryIds);

        Session createdSession = queryService.create(session);

        //Creator name can change, so we do not save it in the session document in database but add it afterward
        createdSession.setCreatedByName(currentUser.getName());

        logger.info("Successfully created session with ID: {} for scoreboard: {}",
                createdSession.getId(), scoreboardId);
        return createdSession;
    }

    /**
     * Get all sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of sessions
     */
    public List<Session> getSessionsByScoreboardId(String scoreboardId) {
        logger.info("Fetching sessions for scoreboard ID: {}", scoreboardId);

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        List<Session> sessions = queryService.find(query, Session.class, false);

        logger.info("Found {} sessions for scoreboard ID: {}", sessions.size(), scoreboardId);
        return sessions;
    }
    
    /**
     * Get a session by ID if it's active.
     * @param id The session ID
     * @return The session with data if found
     */
    public SessionDTO getSessionById(String id) {
        logger.info("Fetching session by ID: {}", id);

        Optional<SessionDTO> sessionOpt = queryService.fetchSessionWithPointCategoriesAndResultEntries(id);
        SessionDTO session = sessionOpt.orElseThrow(() -> new IllegalArgumentException("Session not found"));

        logger.info("Found active session with ID: {}", session.getId());
        return session;
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

        Optional<Session> updatedSessionOpt = queryService.updateById(id, Session.class, session -> {
            if (isPending != null) session.setIsPending(isPending);
            if (participantIds != null) session.setParticipants(participantIds);
            if (pointCategoryIds != null) session.setPointCategories(pointCategoryIds);
            if (resultEntryIds != null) session.setResultEntries(resultEntryIds);
        });

        Session updatedSession = updatedSessionOpt.orElseThrow(() -> new IllegalArgumentException("Session not found"));

        logger.info("Successfully updated session: {}", updatedSession.getId());
        return updatedSession;
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

        List<Session> deletedSessions = queryService.deleteAll(ids, Session.class);

        //Delete related result entries
        queryService.delete(
                new Query(Criteria.where("sessionId").in(ids)), ResultEntry.class);

        logger.info("Successfully deleted sessions: {}", ids);
        return deletedSessions;
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

        SessionDTO session = getSessionById(id);

        List<ResultEntry> resultEntries = session.getResultEntryDetails();

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
            for (ResultEntry entry : resultEntries) {
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

        Set<String> resultEntryIds = resultEntries.stream().map(ResultEntry::getId).collect(Collectors.toSet());

        Optional<Session> finishedSessionOpt = queryService.updateById(id, Session.class, s -> {
                if (!s.getIsPending()) {
                    logger.warn("Session {} is already finished", id);
                    throw new IllegalArgumentException("Session is already finished");
                }
                s.setResultEntries(resultEntryIds);
                s.setIsPending(false);
        });

        Session finishedSession = finishedSessionOpt.orElseThrow(() ->
                new IllegalArgumentException("Session not found"));

        // Mark all result entries as not pending
        queryService.updateAll(resultEntryIds, ResultEntry.class, re -> re.setIsPending(false));

        logger.info("Successfully finished session: {}", finishedSession.getId());
        return finishedSession;
    }

    public List<Session> getPendingSessionsByScoreboardId(String scoreboardId) {
        logger.info("Fetching pending sessions by scoreboard ID: {}", scoreboardId);

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId)
                .and("isPending").is(true));
        List<Session> sessions = queryService.find(query, Session.class, false);

        logger.info("Found {} pending sessions for scoreboard {}", sessions.size(), scoreboardId);
        return sessions;
    }

    public Boolean isUserParticipatingInSession(String scoreboardId, String userId) {
        logger.info("Checking if user {} is participating in session", userId);

        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId)
                .and("participants").in(userId).and("isPending").is(true));
        List<Session> sessions = queryService.find(query, Session.class, false);
        return !sessions.isEmpty();
    }
}

