package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.SessionRepository;
import com.mikko_huttunen.scoreboards.repositories.ScoreboardRepository;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service class for handling Session business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class SessionService {
    
    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
    
    private final SessionRepository sessionRepository;
    private final ScoreboardRepository scoreboardRepository;
    private final UserRepository userRepository;
    private final ResultEntryService resultEntryService;
    private final AuthProvider authProvider;
    
    @Autowired
    public SessionService(
            SessionRepository sessionRepository,
            ScoreboardRepository scoreboardRepository,
            UserRepository userRepository,
            ResultEntryService resultEntryService, AuthProvider authProvider) {
        this.sessionRepository = sessionRepository;
        this.scoreboardRepository = scoreboardRepository;
        this.userRepository = userRepository;
        this.resultEntryService = resultEntryService;
        this.authProvider = authProvider;
    }

    /**
     * Get all active sessions for a specific scoreboard (non-pending only).
     * @param scoreboardId The scoreboard ID
     * @return List of active non-pending sessions
     */
    public List<Session> getSessionsByScoreboardId(String scoreboardId) {
        logger.info("Fetching sessions for scoreboard ID: {}", scoreboardId);

        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.warn("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        try {
            List<Session> sessions = sessionRepository.findByScoreboardIdAndIsPendingFalseAndIsActiveTrue(scoreboardId);

            String auth0UserId = authProvider.requireAuth0UserId();
            Optional<User> user = userRepository.findByAuth0IdAndIsActiveTrue(auth0UserId);
            if (user.isPresent()) {
                if (sessions.stream().noneMatch(session -> session.getParticipants().contains(user.get().getId()))) {
                    logger.warn("User with Auth0 User ID {} is not a participant of scoreboard {}", auth0UserId, scoreboardId);
                    throw new IllegalArgumentException("User is not authorized to access this scoreboard");
                }
            } else {
                logger.warn("User with Auth0 User ID {} not found or is inactive", auth0UserId);
                throw new IllegalArgumentException("User is not authorized to access this scoreboard");
            }

            logger.info("Found {} active non-pending sessions for scoreboard ID: {}", sessions.size(), scoreboardId);
            return sessions;
        } catch (Exception e) {
            logger.error("Error fetching sessions for scoreboard ID {}: {}", scoreboardId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch sessions", e);
        }
    }
    
    /**
     * Get a session by ID if it's active.
     * @param id The session ID
     * @return The session if found and active, null otherwise
     */
    public Session getSessionById(String id) {
        logger.info("Fetching session by ID: {}", id);
        
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Invalid session ID provided: {}", id);
            return null;
        }
        
        try {
            Optional<Session> session = sessionRepository.findByIdAndIsActiveTrue(id);
            if (session.isPresent()) {
                logger.info("Found active session with ID: {}", id);
                return session.get();
            } else {
                logger.warn("Session with ID {} not found or not active", id);
                return null;
            }
        } catch (Exception e) {
            logger.error("Error fetching session by ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch session", e);
        }
    }
    
    /**
     * Create a new session.
     * @param scoreboardId The scoreboard ID
     * @param scoreboardName The scoreboard name
     * @param participantIds List of user IDs participating in the session
     * @param pointCategoryIds List of point category IDs for the session
     * @param createdById The ID of the user creating the session
     * @return The created session
     */
    @Transactional
    public Session createSession(
            String scoreboardId,
            String scoreboardName,
            List<String> participantIds,
            List<String> pointCategoryIds,
            String createdById) {
        logger.info("Creating new session for scoreboard: {} by user: {}", scoreboardName, createdById);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Invalid scoreboard ID provided: {}", scoreboardId);
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        if (scoreboardName == null || scoreboardName.trim().isEmpty()) {
            logger.error("Invalid scoreboard name provided: {}", scoreboardName);
            throw new IllegalArgumentException("Scoreboard name cannot be null or empty");
        }
        
        if (createdById == null || createdById.trim().isEmpty()) {
            logger.error("Invalid created by ID provided: {}", createdById);
            throw new IllegalArgumentException("Created by ID cannot be null or empty");
        }
        
        // Verify scoreboard exists
        Optional<Scoreboard> scoreboardOpt = scoreboardRepository.findByIdAndIsActiveTrue(scoreboardId);
        if (scoreboardOpt.isEmpty()) {
            logger.error("Scoreboard {} not found or is inactive", scoreboardId);
            throw new IllegalArgumentException("Scoreboard not found or is inactive");
        }
        
        // Verify participants exist and belong to the scoreboard
        if (participantIds != null && !participantIds.isEmpty()) {
            Scoreboard scoreboard = scoreboardOpt.get();
            List<String> allParticipants = new ArrayList<>();
            // Add creator
            allParticipants.add(scoreboard.getCreatedBy());
            // Get all users for the scoreboard (creator + joined users)
            List<User> scoreboardUsers = userRepository.findByScoreboardsContainingAndIsActiveTrue(scoreboardId);
            for (User user : scoreboardUsers) {
                if (!allParticipants.contains(user.getId())) {
                    allParticipants.add(user.getId());
                }
            }
            
            for (String participantId : participantIds) {
                if (!allParticipants.contains(participantId)) {
                    logger.warn("Participant {} is not a member of scoreboard {}", participantId, scoreboardId);
                    throw new IllegalArgumentException("All participants must be members of the scoreboard");
                }
                
                Optional<User> userOpt = userRepository.findByIdAndIsActiveTrue(participantId);
                if (userOpt.isEmpty()) {
                    logger.warn("Participant {} not found or is inactive", participantId);
                    throw new IllegalArgumentException("Participant not found or is inactive");
                }
            }
        }
        
        try {
            Date now = new Date();
            
            Session session = new Session();
            session.setId(UUID.randomUUID().toString());
            session.setCreatedById(createdById);
            session.setScoreboardId(scoreboardId);
            session.setScoreboardName(scoreboardName);
            session.setIsPending(true);
            session.setParticipants(participantIds != null ? new ArrayList<>(participantIds) : new ArrayList<>());
            session.setPointCategories(pointCategoryIds != null ? new ArrayList<>(pointCategoryIds) : new ArrayList<>());
            session.setResultEntries(new ArrayList<>());
            session.setCreated(now);
            session.setLastModified(now);
            session.setCreatedBy(createdById);
            session.setIsActive(true);
            
            Session savedSession = sessionRepository.save(session);
            logger.info("Successfully created session with ID: {} for scoreboard: {}", 
                    savedSession.getId(), scoreboardName);
            
            // Create ResultEntry for all participants including the creator
            List<String> allParticipantIds = new ArrayList<>();
            allParticipantIds.add(createdById); // Add creator
            if (participantIds != null) {
                for (String participantId : participantIds) {
                    if (!allParticipantIds.contains(participantId)) {
                        allParticipantIds.add(participantId);
                    }
                }
            }
            
            for (String participantId : allParticipantIds) {
                try {
                    resultEntryService.createResultEntry(
                            scoreboardId,
                            savedSession.getId(),
                            participantId,
                            createdById
                    );
                    logger.info("Created result entry for participant: {} in session: {}", 
                            participantId, savedSession.getId());
                } catch (Exception e) {
                    logger.error("Error creating result entry for participant {} in session {}: {}", 
                            participantId, savedSession.getId(), e.getMessage(), e);
                    // Continue with other participants even if one fails
                }
            }
            
            return savedSession;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error creating session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating session: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create session: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update an existing session.
     * @param id The session ID
     * @param participantIds Updated list of participant IDs (optional)
     * @param pointCategoryIds Updated list of point category IDs (optional)
     * @param userId The ID of the user updating the session
     * @return The updated session if found
     */
    @Transactional
    public Session updateSession(
            String id,
            List<String> participantIds,
            List<String> pointCategoryIds,
            String userId) {
        logger.info("Updating session: {} by user: {}", id, userId);
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", id);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Optional<Session> sessionOpt = sessionRepository.findByIdAndIsActiveTrue(id);
            if (sessionOpt.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return null;
            }
            
            Session session = sessionOpt.get();
            
            // Only creator can update
            if (!session.getCreatedById().equals(userId)) {
                logger.error("User {} is not authorized to update session {}", userId, id);
                throw new IllegalArgumentException("Only the session creator can update the session");
            }
            
            if (participantIds != null) {
                session.setParticipants(new ArrayList<>(participantIds));
            }
            
            if (pointCategoryIds != null) {
                session.setPointCategories(new ArrayList<>(pointCategoryIds));
            }
            
            session.setLastModified(new Date());
            Session updatedSession = sessionRepository.save(session);
            logger.info("Successfully updated session: {}", id);
            return updatedSession;
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
     * @param id The session ID
     * @param userId The ID of the user deleting the session
     * @return True if deleted, false if not found
     */
    @Transactional
    public boolean deleteSession(String id, String userId) {
        logger.info("Deleting session: {} by user: {}", id, userId);
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", id);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Optional<Session> sessionOpt = sessionRepository.findByIdAndIsActiveTrue(id);
            if (sessionOpt.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return false;
            }
            
            Session session = sessionOpt.get();
            
            // Only creator can delete
            if (!session.getCreatedById().equals(userId)) {
                logger.error("User {} is not authorized to delete session {}", userId, id);
                throw new IllegalArgumentException("Only the session creator can delete the session");
            }
            
            session.setIsActive(false);
            session.setLastModified(new Date());
            sessionRepository.save(session);
            logger.info("Successfully deleted session: {}", id);
            return true;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error deleting session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting session {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to delete session: " + e.getMessage(), e);
        }
    }
    
    /**
     * Finish a session by checking all participants have submitted results and updating the session.
     * @param id The session ID
     * @param userId The ID of the user finishing the session (must be creator)
     * @return The updated session if found and finished successfully
     */
    @Transactional
    public Session finishSession(String id, String userId) {
        logger.info("Finishing session: {} by user: {}", id, userId);
        
        if (id == null || id.trim().isEmpty()) {
            logger.error("Invalid session ID provided: {}", id);
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }
        
        try {
            Optional<Session> sessionOpt = sessionRepository.findByIdAndIsActiveTrue(id);
            if (sessionOpt.isEmpty()) {
                logger.warn("Session {} not found or is inactive", id);
                return null;
            }
            
            Session session = sessionOpt.get();
            
            // Only creator can finish session
            if (!session.getCreatedById().equals(userId)) {
                logger.error("User {} is not authorized to finish session {}", userId, id);
                throw new IllegalArgumentException("Only the session creator can finish the session");
            }
            
            // Check if session is pending
            if (!session.getIsPending()) {
                logger.warn("Session {} is already finished", id);
                throw new IllegalArgumentException("Session is already finished");
            }
            
            // Get all result entries for this session
            List<ResultEntry> resultEntries = resultEntryService.getResultEntriesBySession(id);
            
            // Get all participant IDs (including creator)
            List<String> allParticipantIds = new ArrayList<>();
            allParticipantIds.add(session.getCreatedById());
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
            
            // Update session with result entry IDs and set isPending to false
            List<String> resultEntryIds = new ArrayList<>();
            for (ResultEntry entry : resultEntries) {
                resultEntryIds.add(entry.getId());
            }
            session.setResultEntries(resultEntryIds);
            session.setIsPending(false);
            session.setLastModified(new Date());
            
            Session updatedSession = sessionRepository.save(session);
            logger.info("Successfully finished session: {}", id);
            return updatedSession;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error finishing session: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error finishing session {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to finish session: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get all pending sessions for a specific user (as participant or creator).
     * @param userId The user ID
     * @return List of pending sessions
     */
    public List<Session> getPendingSessionsByUser(String userId) {
        logger.info("Fetching pending sessions for user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.warn("Invalid user ID provided: {}", userId);
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        
        try {
            // Get sessions where user is a participant
            List<Session> participantSessions = sessionRepository.findByParticipantsContainingAndIsPendingTrueAndIsActiveTrue(userId);
            // Get sessions created by the user
            List<Session> createdSessions = sessionRepository.findByCreatedByIdAndIsPendingTrueAndIsActiveTrue(userId);
            
            // Combine and deduplicate
            List<Session> allSessions = new ArrayList<>();
            java.util.Set<String> sessionIds = new java.util.HashSet<>();
            
            for (Session session : participantSessions) {
                if (!sessionIds.contains(session.getId())) {
                    sessionIds.add(session.getId());
                    allSessions.add(session);
                }
            }
            
            for (Session session : createdSessions) {
                if (!sessionIds.contains(session.getId())) {
                    sessionIds.add(session.getId());
                    allSessions.add(session);
                }
            }
            
            // Include all sessions - sessions remain pending until creator finishes them
            // Users can edit their scores even after submitting
            List<Session> filteredSessions = new ArrayList<>(allSessions);
            
            logger.info("Found {} pending sessions for user: {} (filtered from {} total)", 
                    filteredSessions.size(), userId, allSessions.size());
            return filteredSessions;
        } catch (Exception e) {
            logger.error("Error fetching pending sessions for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch pending sessions", e);
        }
    }
}

