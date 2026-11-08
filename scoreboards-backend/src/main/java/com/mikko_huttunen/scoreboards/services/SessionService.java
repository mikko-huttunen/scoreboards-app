package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.Constants;
import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.dtos.UpdateSessionDTO;
import com.mikko_huttunen.scoreboards.enums.HistoryAction;
import com.mikko_huttunen.scoreboards.enums.Permission;
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
    private final ResultEntryService resultEntryService;
    private final HistoryEventService historyEventService;
    
    @Autowired
    public SessionService(
            CurrentUserContext currentUserContext,
            QueryService queryService,
            ResultEntryService resultEntryService,
            HistoryEventService historyEventService) {
        this.currentUserContext = currentUserContext;
        this.queryService = queryService;
        this.resultEntryService = resultEntryService;
        this.historyEventService = historyEventService;
    }

    /**
     * Create a new session.
     * @param scoreboardId The scoreboard ID
     * @param sessionName The name of the session
     * @param description Optional description for the session
     * @param participantIds List of user IDs participating in the session
     * @param pointCategoryIds List of point category IDs for the session
     * @return The created session
     */
    @Transactional
    public Session createSession(
            String scoreboardId,
            String sessionName,
            String description,
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
        session.setDescription(description);
        session.setIsPending(true);
        session.setParticipants(participantIds);
        session.setPointCategories(pointCategoryIds);

        Session createdSession = queryService.create(session);

        historyEventService.createHistoryEvent(
                scoreboardId,
                HistoryAction.CREATE,
                Constants.Types.SESSION,
                createdSession.getId(),
                null,
                historyEventService.buildSessionDetails(sessionName, description, participantIds, pointCategoryIds)
        );

        //Creator name can change, so we do not save it in the session document in database but add it afterward
        createdSession.setCreatedByName(currentUser.getName());

        logger.info("Successfully created session with ID: {} for scoreboard: {}",
                createdSession.getId(), scoreboardId);
        return createdSession;
    }

    /**
     * Get all pending or non-pending sessions for a specific scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of sessions
     */
    public List<SessionDTO> getSessionsByScoreboardId(String scoreboardId, Boolean isPending) {
        logger.info("Fetching sessions (isPending: {}) for scoreboard ID: {}", isPending, scoreboardId);

        Optional<List<SessionDTO>> sessionsOpt = queryService.fetchScoreboardSessionsWithCreatedByNames(scoreboardId, isPending);
        if (sessionsOpt.isEmpty()) {
            return Collections.emptyList();
        }

        List<SessionDTO> sessions = sessionsOpt.orElseThrow(() ->
                new IllegalArgumentException("Failed to fetch sessions"));

        logger.info("Found {} sessions (isPending: {}) for scoreboard ID: {}", sessions.size(), isPending, scoreboardId);
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
     * @param dto The updated session data
     * @return The updated session if found
     */
    @Transactional
    public SessionDTO updateSession(
            String id,
            UpdateSessionDTO dto
    ) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Updating session: {} by user: {}", id, currentUser.getId());

        SessionDTO existingSessionData = getSessionById(id);

        Membership membership = currentUser.getMemberships() == null
                ? null
                : currentUser.getMemberships().stream()
                  .filter(ms -> existingSessionData.getScoreboardId().equals(ms.getScoreboardId()))
                  .findFirst()
                  .orElse(null);

        boolean isScoreboardOwner = membership != null && membership.getPermissions().contains(Permission.OWNER);
        boolean isSessionCreator = currentUser.getId().equals(existingSessionData.getCreatedBy());
        boolean isParticipant = existingSessionData.getParticipants() != null
                && existingSessionData.getParticipants().contains(currentUser.getId());

        boolean canUpdate = membership != null && (isScoreboardOwner || isSessionCreator || isParticipant);

        if (!canUpdate) {
            logger.error("User {} does not have permission to update session {}", currentUser.getId(), id);
            throw new IllegalArgumentException("User does not have permission to update this session");
        }

        List<UpdateSessionDTO.ResultEntryUpdateDTO> updatedResultEntries = dto.getResultEntries();

        if (isScoreboardOwner || isSessionCreator) {
            String updatedName = dto.getName();
            String updatedDescription = dto.getDescription();

            boolean nameChanged = updatedName != null && !updatedName.equals(existingSessionData.getName());
            boolean descriptionChanged = updatedDescription != null && !updatedDescription.equals(existingSessionData.getDescription());

            if (nameChanged || descriptionChanged) {
                queryService.updateById(id, Session.class, existingSession -> {
                    existingSession.setName(updatedName);
                    if (updatedDescription != null) {
                        existingSession.setDescription(updatedDescription);
                    }
                }).orElseThrow(() -> new IllegalArgumentException("Session not found"));
            }
        }

        // Only the scoreboard owner or session creator may hand-pick the tie winner from the edit
        // form. Participants resolve ties through the tie breaker endpoint instead.
        String requestedTieWinner = (isScoreboardOwner || isSessionCreator) ? dto.getTieWinner() : null;

        if (updatedResultEntries != null && !updatedResultEntries.isEmpty()) {
            Map<String, UpdateSessionDTO.ResultEntryUpdateDTO> updateById = updatedResultEntries.stream()
                    .filter(Objects::nonNull)
                    .collect(Collectors.toMap(UpdateSessionDTO.ResultEntryUpdateDTO::getId,
                            e ->
                                    e, (a, b) -> b));

            Set<String> resultEntryIds = updateById.keySet();

            queryService.updateAll(resultEntryIds, ResultEntry.class, re -> {
                UpdateSessionDTO.ResultEntryUpdateDTO update = updateById.get(re.getId());
                if (update == null) return;

                Set<Result> results = update.getResults();
                if (results == null) results = new HashSet<>();

                double totalPoints = results.stream()
                        .mapToDouble(r -> r.getPoints() == null ? 0.0 : r.getPoints())
                        .sum();

                re.setResults(results);
                re.setTotalPoints(totalPoints);
                re.setIsPending(false);
            });
        }

        // Scores may have created, removed, or reshaped the tie, so always re-derive it from the
        // freshly persisted results rather than trusting the stored flag.
        SessionDTO sessionDataAfterScores = getSessionById(id);
        applyTieState(id, sessionDataAfterScores, requestedTieWinner);

        SessionDTO updatedSessionData = getSessionById(id);

        // Only a real change to an already finished session counts as an edit, so opening and
        // saving the editor without touching anything does not flag the session.
        if (!Boolean.TRUE.equals(updatedSessionData.getIsPending())
                && hasSessionChanges(existingSessionData, updatedSessionData)) {
            Date editedAt = new Date();

            queryService.updateById(id, Session.class, existingSession ->
                    existingSession.setEditedAt(editedAt)
            ).orElseThrow(() -> new IllegalArgumentException("Session not found"));

            updatedSessionData.setEditedAt(editedAt);
        }

        historyEventService.createSessionEditEvent(
                updatedSessionData.getScoreboardId(),
                updatedSessionData.getId(),
                updatedSessionData.getName(),
                existingSessionData,
                updatedSessionData
        );

        return updatedSessionData;
    }

    /**
     * Resolve a tie breaker by recording the chosen winner.
     * @param id The session ID
     * @param tieWinnerUserId The user ID of the participant picked as the winner
     * @return The updated session
     */
    @Transactional
    public SessionDTO resolveTieWinner(String id, String tieWinnerUserId) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Resolving tie for session: {} to user: {} by user: {}", id, tieWinnerUserId, currentUser.getId());

        SessionDTO existingSessionData = getSessionById(id);

        Membership membership = currentUser.getMemberships() == null
                ? null
                : currentUser.getMemberships().stream()
                  .filter(ms -> existingSessionData.getScoreboardId().equals(ms.getScoreboardId()))
                  .findFirst()
                  .orElse(null);

        boolean isScoreboardOwner = membership != null && membership.getPermissions().contains(Permission.OWNER);
        boolean isSessionCreator = currentUser.getId().equals(existingSessionData.getCreatedBy());
        boolean isParticipant = existingSessionData.getParticipants() != null
                && existingSessionData.getParticipants().contains(currentUser.getId());

        if (membership == null || !(isScoreboardOwner || isSessionCreator || isParticipant)) {
            logger.error("User {} does not have permission to resolve the tie of session {}", currentUser.getId(), id);
            throw new IllegalArgumentException("User does not have permission to resolve this tie");
        }

        if (Boolean.TRUE.equals(existingSessionData.getIsPending())) {
            logger.error("Cannot resolve the tie of pending session {}", id);
            throw new IllegalArgumentException("Cannot resolve a tie before the session has finished");
        }

        if (existingSessionData.getTieWinner() != null) {
            logger.warn("Tie of session {} has already been resolved", id);
            throw new IllegalArgumentException("Tie has already been resolved");
        }

        applyTieState(id, existingSessionData, tieWinnerUserId);

        SessionDTO updatedSessionData = getSessionById(id);

        historyEventService.createSessionEditEvent(
                updatedSessionData.getScoreboardId(),
                updatedSessionData.getId(),
                updatedSessionData.getName(),
                existingSessionData,
                updatedSessionData
        );

        logger.info("Successfully resolved tie of session {} to user {}", id, tieWinnerUserId);
        return updatedSessionData;
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

        deletedSessions.forEach(session -> {
            resultEntryService.deleteResultEntriesBySessionId(session.getId());

            Query commentQuery = new Query(Criteria.where("sessionId").is(session.getId()));
            queryService.delete(commentQuery, Comment.class);

            historyEventService.createHistoryEvent(
                    session.getScoreboardId(),
                    session.getIsPending() ? HistoryAction.CANCEL_SESSION : HistoryAction.DELETE,
                    Constants.Types.SESSION,
                    session.getId(),
                    session.getName(),
                    Collections.emptyMap()
            );
        });

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

        Membership userMembership = currentUser.getMemberships().stream().filter(ms ->
                ms.getScoreboardId().equals(session.getScoreboardId())).findFirst().orElse(null);
        if (userMembership == null) {
            logger.error("User {} is not a member of scoreboard {}", currentUser.getId(), session.getScoreboardId());
            throw new IllegalArgumentException("User is not a member of this scoreboard");
        }

        boolean hasPermission = userMembership.getPermissions().contains(Permission.SESSIONS) ||
                userMembership.getPermissions().contains(Permission.OWNER);
        if (!hasPermission) {
            logger.error("User {} does not have permission to finish session {}", currentUser.getId(), id);
            throw new IllegalArgumentException("User does not have permission to finish this session");
        }

        if (!session.getParticipants().contains(currentUser.getId()) &&
                !session.getCreatedBy().equals(currentUser.getId())) {
            logger.error("User {} is not a participant in session {}", currentUser.getId(), id);
            throw new IllegalArgumentException("User is not a participant in this session");
        }

        List<ResultEntry> resultEntries = session.getResultEntryDetails();

        // Get all participant IDs
        List<String> allParticipantIds = new ArrayList<>();
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

        // A session that finishes with two or more participants sharing the top total starts out
        // with an unresolved tie, which the tie breaker modal prompts a participant to settle.
        boolean hasUnresolvedTie = !findTiedUserIds(session).isEmpty();

        Optional<Session> finishedSessionOpt = queryService.updateById(id, Session.class, s -> {
                if (!s.getIsPending()) {
                    logger.warn("Session {} has already finished", id);
                    throw new IllegalArgumentException("Session has already finished");
                }
                s.setFinishedAt(new Date());
                s.setResultEntries(resultEntryIds);
                s.setIsPending(false);
                s.setIsTieResolved(!hasUnresolvedTie);
                s.setTieWinner(null);
        });

        Session finishedSession = finishedSessionOpt.orElseThrow(() ->
                new IllegalArgumentException("Session not found"));

        // Mark all result entries as not pending
        queryService.updateAll(resultEntryIds, ResultEntry.class, re -> re.setIsPending(false));

        historyEventService.createHistoryEvent(
                finishedSession.getScoreboardId(),
                HistoryAction.FINISH_SESSION,
                Constants.Types.SESSION,
                finishedSession.getId(),
                finishedSession.getName(),
                Collections.emptyMap()
        );

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

    /**
     * Find the participants sharing the session's highest total points.
     * A tie only counts when two or more participants share a positive top total, which matches
     * the rule the results chart uses to decide whether it announces a winner at all.
     * @param session The session to inspect
     * @return The tied user IDs, or an empty set when there is no tie to break
     */
    private Set<String> findTiedUserIds(SessionDTO session) {
        Set<String> participants = session.getParticipants() == null
                ? Collections.emptySet()
                : session.getParticipants();

        List<ResultEntry> entries = session.getResultEntryDetails() == null
                ? Collections.emptyList()
                : session.getResultEntryDetails();

        Map<String, Double> totalsByUserId = new HashMap<>();

        for (ResultEntry entry : entries) {
            if (!Boolean.TRUE.equals(entry.getIsActive())) continue;
            if (!participants.contains(entry.getUserId())) continue;

            double total = entry.getResults() == null
                    ? 0.0
                    : entry.getResults().stream()
                        .mapToDouble(r -> r.getPoints() == null ? 0.0 : r.getPoints())
                        .sum();

            totalsByUserId.merge(entry.getUserId(), total, Double::sum);
        }

        if (totalsByUserId.isEmpty()) {
            return Collections.emptySet();
        }

        double bestTotal = Collections.max(totalsByUserId.values());
        if (bestTotal <= 0.0) {
            return Collections.emptySet();
        }

        Set<String> tiedUserIds = totalsByUserId.entrySet().stream()
                .filter(e -> Double.compare(e.getValue(), bestTotal) == 0)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        return tiedUserIds.size() > 1 ? tiedUserIds : Collections.emptySet();
    }

    /**
     * Re-derive a session's tie state from its current results and persist it.
     * @param id The session ID
     * @param session The session data to derive the tie from
     * @param requestedTieWinner The explicitly requested winner, null to keep the stored one when
     *                           it is still tied, or blank to clear it and reopen the tie
     */
    private void applyTieState(String id, SessionDTO session, String requestedTieWinner) {
        Set<String> tiedUserIds = findTiedUserIds(session);

        String nextTieWinner;

        if (requestedTieWinner == null) {
            // No explicit intent: keep the stored winner only while they are still tied for the lead.
            String storedTieWinner = session.getTieWinner();
            nextTieWinner = tiedUserIds.contains(storedTieWinner) ? storedTieWinner : null;
        } else if (requestedTieWinner.isBlank()) {
            nextTieWinner = null;
        } else {
            if (tiedUserIds.isEmpty()) {
                logger.error("Session {} has no tie to resolve", id);
                throw new IllegalArgumentException("Session has no tie to resolve");
            }
            if (!tiedUserIds.contains(requestedTieWinner)) {
                logger.error("User {} is not tied for the lead in session {}", requestedTieWinner, id);
                throw new IllegalArgumentException("Tie winner must be one of the tied participants");
            }
            nextTieWinner = requestedTieWinner;
        }

        boolean nextIsTieResolved = tiedUserIds.isEmpty() || nextTieWinner != null;

        // Sessions written before tie breakers existed have no flag at all; treat that as resolved
        // so untied legacy sessions are not rewritten on every edit.
        boolean currentIsTieResolved = !Boolean.FALSE.equals(session.getIsTieResolved());

        boolean unchanged = Objects.equals(nextTieWinner, session.getTieWinner())
                && nextIsTieResolved == currentIsTieResolved;

        if (unchanged) {
            return;
        }

        queryService.updateById(id, Session.class, existingSession -> {
            existingSession.setTieWinner(nextTieWinner);
            existingSession.setIsTieResolved(nextIsTieResolved);
        }).orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    /**
     * Whether an update actually changed anything the editor can touch.
     * @param before The session data before the update
     * @param after The session data after the update
     * @return True when the name, description, tie winner, or any score changed
     */
    private boolean hasSessionChanges(SessionDTO before, SessionDTO after) {
        return !Objects.equals(before.getName(), after.getName())
                || !Objects.equals(before.getDescription(), after.getDescription())
                || !Objects.equals(before.getTieWinner(), after.getTieWinner())
                || !Objects.equals(scoresByResultEntryId(before), scoresByResultEntryId(after));
    }

    /**
     * Flatten a session's scores into comparable plain values, keyed by result entry ID.
     * @param session The session data to read the result entries from
     * @return Points per point category for every result entry
     */
    private Map<String, Map<String, Double>> scoresByResultEntryId(SessionDTO session) {
        List<ResultEntry> resultEntries = session.getResultEntryDetails();
        if (resultEntries == null) return Collections.emptyMap();

        Map<String, Map<String, Double>> scores = new HashMap<>();

        for (ResultEntry resultEntry : resultEntries) {
            Map<String, Double> pointsByCategoryId = new HashMap<>();

            for (Result result : Optional.ofNullable(resultEntry.getResults()).orElse(Collections.emptySet())) {
                pointsByCategoryId.put(
                        result.getPointCategoryId(),
                        result.getPoints() == null ? 0.0 : result.getPoints()
                );
            }

            scores.put(resultEntry.getId(), pointsByCategoryId);
        }

        return scores;
    }
}

