package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.query.Query;

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
        return m;
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
        // creator name added post-persist
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
        Session s = new Session();
        s.setId("s-1");
        when(queryService.find(any(Query.class), eq(Session.class), eq(false))).thenReturn(List.of(s));

        List<Session> result = sessionService.getSessionsByScoreboardId("sb-1");

        assertEquals(1, result.size());
        assertEquals("s-1", result.get(0).getId());
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
    void updateSession_appliesNonNullFields() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        Session updated = new Session();
        updated.setId("s-1");
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(updated);
                    return Optional.of(updated);
                });

        Session result = sessionService.updateSession(
                "s-1", false, Set.of("user-2"), Set.of("pc-2"), Set.of("re-1"));

        assertEquals("s-1", result.getId());
        assertFalse(result.getIsPending());
        assertEquals(Set.of("user-2"), result.getParticipants());
        assertEquals(Set.of("pc-2"), result.getPointCategories());
        assertEquals(Set.of("re-1"), result.getResultEntries());
    }

    @Test
    void updateSession_ignoresNullFields() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        Session existing = new Session();
        existing.setId("s-1");
        existing.setIsPending(true);
        existing.setParticipants(Set.of("orig"));
        when(queryService.updateById(eq("s-1"), eq(Session.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<Session> updater = inv.getArgument(2);
                    updater.update(existing);
                    return Optional.of(existing);
                });

        Session result = sessionService.updateSession("s-1", null, null, null, null);

        assertTrue(result.getIsPending());
        assertEquals(Set.of("orig"), result.getParticipants());
    }

    @Test
    void updateSession_throwsWhenNotFound() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.updateById(eq("s-1"), eq(Session.class), any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> sessionService.updateSession("s-1", true, null, null, null));
    }

    // ---------------------------------------------------------------------
    // deleteSessions
    // ---------------------------------------------------------------------

    @Test
    void deleteSessions_deletesSessionsAndRelatedResultEntries() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        Session deleted = new Session();
        deleted.setId("s-1");
        when(queryService.deleteAll(Set.of("s-1"), Session.class)).thenReturn(List.of(deleted));

        List<Session> result = sessionService.deleteSessions(Set.of("s-1"));

        assertEquals(1, result.size());
        verify(queryService).delete(any(Query.class), eq(ResultEntry.class));
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

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
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

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
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

        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
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
        assertEquals("Session is already finished", ex.getMessage());
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
