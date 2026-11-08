package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.dtos.UpdateSessionDTO;
import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.query.Query;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SessionService}.
 */
@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private QueryService queryService;
    @Mock
    private HistoryEventService historyEventService;

    @InjectMocks
    private SessionService sessionService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setName("Alice");
    }

    private Membership membership(String userId) {
        Membership m = new Membership();
        m.setScoreboardId("sb-1");
        m.setUserId(userId);
        m.setPermissions(Set.of(Permission.SESSIONS, Permission.OWNER));
        return m;
    }

    private Membership membership(String userId, Set<Permission> permissions) {
        Membership m = new Membership();
        m.setScoreboardId("sb-1");
        m.setUserId(userId);
        m.setPermissions(permissions);
        return m;
    }

    private Result result(double points) {
        Result r = new Result();
        r.setPointCategoryId("pc-1");
        r.setPoints(points);
        return r;
    }

    private UpdateSessionDTO.ResultEntryUpdateDTO updateResultEntry(String id, String userId, double... points) {
        UpdateSessionDTO.ResultEntryUpdateDTO dto = new UpdateSessionDTO.ResultEntryUpdateDTO();
        dto.setId(id);
        dto.setUserId(userId);
        Set<Result> results = new HashSet<>();
        for (double point : points) {
            results.add(result(point));
        }
        dto.setResults(results);
        return dto;
    }

    private ResultEntry resultEntry(String id, String sessionId, String userId, boolean pending, Set<Result> results) {
        ResultEntry re = new ResultEntry();
        re.setId(id);
        re.setSessionId(sessionId);
        re.setUserId(userId);
        re.setIsPending(pending);
        re.setResults(results);
        return re;
    }

    // ---------------------------------------------------------------------
    // createSession
    // ---------------------------------------------------------------------

    @Test
    void createSession_createsSessionWhenParticipantsAreMembers() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.find(any(Query.class), eq(Membership.class), eq(false)))
                .thenReturn(List.of(membership("user-1"), membership("user-2")));
        when(queryService.create(any(Session.class))).thenAnswer(inv -> inv.getArgument(0));

        Session result = sessionService.createSession(
                "sb-1", "Match Night", "GG", Set.of("user-1", "user-2"), Set.of("pc-1"));

        assertEquals("Match Night", result.getName());
        assertEquals("GG", result.getComment());
        assertTrue(result.getIsPending());
        assertEquals(Set.of("user-1", "user-2"), result.getParticipants());
        assertEquals(Set.of("pc-1"), result.getPointCategories());
        assertEquals("Alice", result.getCreatedByName());
    }

    @Test
    void createSession_throwsWhenParticipantNotMember() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.find(any(Query.class), eq(Membership.class), eq(false)))
                .thenReturn(List.of(membership("user-1")));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.createSession(
                        "sb-1", "Match", null, Set.of("outsider"), Set.of("pc-1")));
        assertEquals("User is not a member of this scoreboard", ex.getMessage());
        verify(queryService, never()).create(any(Session.class));
    }

    // ---------------------------------------------------------------------
    // getSessionsByScoreboardId
    // ---------------------------------------------------------------------

    @Test
    void getSessionsByScoreboardId_delegatesToQueryService() {
        SessionDTO s = new SessionDTO();
        s.setId("s-1");
        when(queryService.fetchScoreboardSessionsWithCreatedByNames("sb-1", true))
                .thenReturn(Optional.of(List.of(s)));

        List<SessionDTO> result = sessionService.getSessionsByScoreboardId("sb-1", true);

        assertEquals(1, result.size());
        assertEquals("s-1", result.getFirst().getId());
    }

    @Test
    void getSessionsByScoreboardId_returnsEmptyListWhenNoSessionsFound() {
        when(queryService.fetchScoreboardSessionsWithCreatedByNames("sb-1", false))
                .thenReturn(Optional.empty());

        List<SessionDTO> result = sessionService.getSessionsByScoreboardId("sb-1", false);

        assertTrue(result.isEmpty());
    }

    // ---------------------------------------------------------------------
    // getSessionById
    // ---------------------------------------------------------------------

    @Test
    void getSessionById_returnsSession() {
        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        SessionDTO result = sessionService.getSessionById("s-1");

        assertEquals("s-1", result.getId());
    }

    @Test
    void getSessionById_throwsWhenMissing() {
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("missing"))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.getSessionById("missing"));
        assertEquals("Session not found", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // updateSession
    // ---------------------------------------------------------------------

    @Test
    void updateSession_updatesSessionAndAllResultEntries_whenUserIsOwner() {
        // Arrange
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1", Set.of(Permission.OWNER))));

        SessionDTO sessionDto = new SessionDTO();
        sessionDto.setId("s-1");
        sessionDto.setScoreboardId("sb-1");
        sessionDto.setName("Old name");
        sessionDto.setComment("Old comment");
        sessionDto.setCreatedBy("user-1");
        sessionDto.setResultEntryDetails(List.of(
                resultEntry("re-1", "s-1", "user-1", true, Set.of(result(0))),
                resultEntry("re-2", "s-1", "user-2", true, Set.of(result(0)))
        ));

        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(sessionDto));

        Session resultAfterSessionUpdate = new Session();
        resultAfterSessionUpdate.setId("s-1");

        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(resultAfterSessionUpdate);
                    // updateSession re-reads the session afterwards, so the persisted change has
                    // to be visible on the DTO the fetch mock hands back
                    sessionDto.setName(resultAfterSessionUpdate.getName());
                    sessionDto.setComment(resultAfterSessionUpdate.getComment());
                    return Optional.of(resultAfterSessionUpdate);
                });

        when(queryService.updateAll(anySet(), eq(ResultEntry.class), any()))
                .thenAnswer(inv -> {
                    // mimic the updater effect on the in-memory result entry objects from sessionDto
                    Set<String> ids = inv.getArgument(0);
                    QueryService.DocumentUpdater<ResultEntry> updater = inv.getArgument(2);

                    for (ResultEntry re : sessionDto.getResultEntryDetails()) {
                        if (ids.contains(re.getId())) {
                            // updater will be called with the object it replaces; tests just need totals/isPending updated
                            updater.update(re);
                        }
                    }
                    return List.of();
                });

        UpdateSessionDTO dto = new UpdateSessionDTO();
        dto.setName("Session test");
        dto.setComment("test comment");
        dto.setResultEntries(List.of(
                updateResultEntry("re-1", "user-1", 12),
                updateResultEntry("re-2", "user-2", 14)
        ));

        // Act
        SessionDTO updated = sessionService.updateSession("s-1", dto);

        // Assert
        assertEquals("Session test", updated.getName());
        assertEquals("test comment", updated.getComment());

        ResultEntry re1 = updated.getResultEntryDetails().stream().filter(re -> re.getId().equals("re-1")).findFirst().orElseThrow();
        ResultEntry re2 = updated.getResultEntryDetails().stream().filter(re -> re.getId().equals("re-2")).findFirst().orElseThrow();

        assertFalse(re1.getIsPending());
        assertFalse(re2.getIsPending());
        assertEquals(12.0, re1.getTotalPoints());
        assertEquals(14.0, re2.getTotalPoints());

        // updateSession re-reads the session to diff history and re-derive the tie state
        verify(queryService, atLeastOnce()).fetchSessionWithPointCategoriesAndResultEntries("s-1");
        verify(queryService).updateById(eq("s-1"), eq(Session.class), any());
        verify(queryService).updateAll(anySet(), eq(ResultEntry.class), any());
    }

    @Test
    void updateSession_throwsWhenUserHasNoPermission() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of()); // no membership for scoreboard

        SessionDTO sessionDto = new SessionDTO();
        sessionDto.setId("s-1");
        sessionDto.setScoreboardId("sb-1");
        sessionDto.setCreatedBy("user-2");
        sessionDto.setName("Old name");
        sessionDto.setComment("Old comment");
        sessionDto.setResultEntryDetails(List.of());

        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(sessionDto));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.updateSession("s-1", new UpdateSessionDTO()));

        assertEquals("User does not have permission to update this session", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), eq(Session.class), any());
        verify(queryService, never()).updateAll(anySet(), eq(ResultEntry.class), any());
    }

    @Test
    void updateSession_allowsSessionsPermissionWhenUpdatingCreatorScoreOnly() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1", Set.of(Permission.SESSIONS))));

        SessionDTO sessionDto = new SessionDTO();
        sessionDto.setId("s-1");
        sessionDto.setScoreboardId("sb-1");
        sessionDto.setCreatedBy("user-1"); // creator is the current user
        sessionDto.setName("Old name");
        sessionDto.setComment("Old comment");
        sessionDto.setResultEntryDetails(List.of(
                resultEntry("re-1", "s-1", "user-1", true, Set.of(result(0)))
        ));

        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(sessionDto));

        Session resultAfterSessionUpdate = new Session();
        resultAfterSessionUpdate.setId("s-1");
        resultAfterSessionUpdate.setName("Old name");
        resultAfterSessionUpdate.setComment("Old comment");

        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(resultAfterSessionUpdate);
                    // updateSession re-reads the session afterwards, so the persisted change has
                    // to be visible on the DTO the fetch mock hands back
                    sessionDto.setName(resultAfterSessionUpdate.getName());
                    sessionDto.setComment(resultAfterSessionUpdate.getComment());
                    return Optional.of(resultAfterSessionUpdate);
                });

        when(queryService.updateAll(anySet(), eq(ResultEntry.class), any()))
                .thenAnswer(inv -> {
                    Set<String> ids = inv.getArgument(0);
                    QueryService.DocumentUpdater<ResultEntry> updater = inv.getArgument(2);

                    for (ResultEntry re : sessionDto.getResultEntryDetails()) {
                        if (ids.contains(re.getId())) {
                            updater.update(re);
                        }
                    }
                    return List.of();
                });

        UpdateSessionDTO dto = new UpdateSessionDTO();
        dto.setName("Session test");
        dto.setComment("test comment");
        dto.setResultEntries(List.of(
                updateResultEntry("re-1", "user-1", 12)
        ));

        // Act
        SessionDTO updated = sessionService.updateSession("s-1", dto);

        // Assert
        assertEquals("Session test", updated.getName());
        assertEquals("test comment", updated.getComment());

        ResultEntry re1 = updated.getResultEntryDetails().getFirst();
        assertEquals("re-1", re1.getId());
        assertEquals(12.0, re1.getTotalPoints());
        assertFalse(re1.getIsPending());

        verify(queryService).updateAll(anySet(), eq(ResultEntry.class), any());
    }

    // ---------------------------------------------------------------------
    // finishSession
    // ---------------------------------------------------------------------

    private ResultEntry resultEntryWithResults(String id, String userId) {
        ResultEntry re = new ResultEntry();
        re.setId(id);
        re.setUserId(userId);
        Result r = new Result();
        r.setPointCategoryId("pc-1");
        r.setPoints(5.0);
        re.setResults(Set.of(r));
        return re;
    }

    @Test
    void finishSession_finishesWhenAllParticipantsSubmitted() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        dto.setScoreboardId("sb-1");
        dto.setCreatedBy("user-1");
        dto.setParticipants(Set.of("user-2"));
        dto.setResultEntryDetails(List.of(
                resultEntryWithResults("re-1", "user-1"),
                resultEntryWithResults("re-2", "user-2")
        ));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session finished = new Session();
        finished.setId("s-1");
        finished.setIsPending(true);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(finished);
                    return Optional.of(finished);
                });
        when(queryService.updateAll(anySet(), eq(ResultEntry.class), any())).thenReturn(List.of());

        Session result = sessionService.finishSession("s-1");

        assertFalse(result.getIsPending());
        verify(queryService).updateAll(anySet(), eq(ResultEntry.class), any());
    }

    @Test
    void finishSession_throwsWhenParticipantHasNotSubmitted() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        dto.setScoreboardId("sb-1");
        dto.setCreatedBy("user-1");
        dto.setParticipants(Set.of("user-2"));
        // Only creator submitted; user-2 has not
        dto.setResultEntryDetails(List.of(resultEntryWithResults("re-1", "user-1")));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.finishSession("s-1"));
        assertEquals("All participants must submit their results before finishing the session",
                ex.getMessage());
        verify(queryService, never()).updateById(anyString(), any(), any());
    }

    @Test
    void finishSession_throwsWhenSessionAlreadyFinished() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        dto.setScoreboardId("sb-1");
        dto.setCreatedBy("user-1");
        dto.setParticipants(Set.of());
        dto.setResultEntryDetails(List.of(resultEntryWithResults("re-1", "user-1")));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session alreadyFinished = new Session();
        alreadyFinished.setId("s-1");
        alreadyFinished.setIsPending(false);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(alreadyFinished); // triggers already-finished check
                    return Optional.of(alreadyFinished);
                });

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.finishSession("s-1"));
        assertEquals("Session has already finished", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // tie breaker
    // ---------------------------------------------------------------------

    private SessionDTO finishedTiedSession() {
        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        dto.setScoreboardId("sb-1");
        dto.setName("Match Night");
        dto.setCreatedBy("user-1");
        dto.setIsPending(false);
        dto.setParticipants(Set.of("user-1", "user-2"));
        dto.setIsTieResolved(false);
        dto.setResultEntryDetails(List.of(
                scoredEntry("re-1", "user-1", 10),
                scoredEntry("re-2", "user-2", 10)
        ));
        return dto;
    }

    private ResultEntry scoredEntry(String id, String userId, double points) {
        ResultEntry re = resultEntry(id, "s-1", userId, false, Set.of(result(points)));
        re.setIsActive(true);
        re.setTotalPoints(points);
        return re;
    }

    @Test
    void finishSession_leavesTieUnresolvedWhenParticipantsShareTopTotal() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = finishedTiedSession();
        dto.setIsPending(true);
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session finished = new Session();
        finished.setId("s-1");
        finished.setIsPending(true);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(finished);
                    return Optional.of(finished);
                });

        sessionService.finishSession("s-1");

        assertFalse(finished.getIsTieResolved());
        assertNull(finished.getTieWinner());
    }

    @Test
    void finishSession_marksTieResolvedWhenThereIsAClearWinner() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = finishedTiedSession();
        dto.setIsPending(true);
        dto.setResultEntryDetails(List.of(
                scoredEntry("re-1", "user-1", 14),
                scoredEntry("re-2", "user-2", 10)
        ));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session finished = new Session();
        finished.setId("s-1");
        finished.setIsPending(true);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(finished);
                    return Optional.of(finished);
                });

        sessionService.finishSession("s-1");

        assertTrue(finished.getIsTieResolved());
    }

    @Test
    void resolveTieWinner_recordsWinnerAmongTiedParticipants() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = finishedTiedSession();
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session persisted = new Session();
        persisted.setId("s-1");
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(persisted);
                    return Optional.of(persisted);
                });

        sessionService.resolveTieWinner("s-1", "user-2");

        assertEquals("user-2", persisted.getTieWinner());
        assertTrue(persisted.getIsTieResolved());
    }

    @Test
    void resolveTieWinner_throwsWhenWinnerIsNotTiedForTheLead() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = finishedTiedSession();
        dto.setParticipants(Set.of("user-1", "user-2", "user-3"));
        dto.setResultEntryDetails(List.of(
                scoredEntry("re-1", "user-1", 10),
                scoredEntry("re-2", "user-2", 10),
                scoredEntry("re-3", "user-3", 4)
        ));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveTieWinner("s-1", "user-3"));

        assertEquals("Tie winner must be one of the tied participants", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), eq(Session.class), any());
    }

    @Test
    void resolveTieWinner_throwsWhenTieAlreadyResolved() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1")));

        SessionDTO dto = finishedTiedSession();
        dto.setIsTieResolved(true);
        dto.setTieWinner("user-1");
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveTieWinner("s-1", "user-2"));

        assertEquals("Tie has already been resolved", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), eq(Session.class), any());
    }

    @Test
    void resolveTieWinner_throwsWhenUserHasNoMembership() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of());

        SessionDTO dto = finishedTiedSession();
        dto.setCreatedBy("user-9");
        dto.setParticipants(Set.of("user-2", "user-3"));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveTieWinner("s-1", "user-2"));

        assertEquals("User does not have permission to resolve this tie", ex.getMessage());
    }

    @Test
    void updateSession_dropsTieWinnerWhenEditedScoresBreakTheTie() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        user.setMemberships(Set.of(membership("user-1", Set.of(Permission.OWNER))));

        SessionDTO dto = finishedTiedSession();
        dto.setIsTieResolved(true);
        dto.setTieWinner("user-1");
        // user-1 pulls ahead, so there is no longer a tie to hold a winner for
        dto.setResultEntryDetails(List.of(
                scoredEntry("re-1", "user-1", 18),
                scoredEntry("re-2", "user-2", 10)
        ));
        when(queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1"))
                .thenReturn(Optional.of(dto));

        Session persisted = new Session();
        persisted.setId("s-1");
        persisted.setTieWinner("user-1");
        persisted.setIsTieResolved(true);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(persisted);
                    return Optional.of(persisted);
                });

        UpdateSessionDTO update = new UpdateSessionDTO();
        update.setResultEntries(List.of());

        sessionService.updateSession("s-1", update);

        assertNull(persisted.getTieWinner());
        assertTrue(persisted.getIsTieResolved());
    }

    // ---------------------------------------------------------------------
    // getPendingSessionsByScoreboardId / isUserParticipatingInSession
    // ---------------------------------------------------------------------

    @Test
    void getPendingSessionsByScoreboardId_delegatesToQueryService() {
        when(queryService.find(any(Query.class), eq(Session.class), eq(false)))
                .thenReturn(List.of(new Session()));

        List<Session> result = sessionService.getPendingSessionsByScoreboardId("sb-1");

        assertEquals(1, result.size());
    }

    @Test
    void isUserParticipatingInSession_trueWhenSessionsExist() {
        when(queryService.find(any(Query.class), eq(Session.class), eq(false)))
                .thenReturn(List.of(new Session()));

        assertTrue(sessionService.isUserParticipatingInSession("sb-1", "user-1"));
    }

    @Test
    void isUserParticipatingInSession_falseWhenNoSessions() {
        when(queryService.find(any(Query.class), eq(Session.class), eq(false)))
                .thenReturn(List.of());

        assertFalse(sessionService.isUserParticipatingInSession("sb-1", "user-1"));
    }
}
