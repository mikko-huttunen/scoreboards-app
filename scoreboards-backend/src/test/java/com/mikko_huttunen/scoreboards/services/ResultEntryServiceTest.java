package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.UpdateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
 * Unit tests for {@link ResultEntryService}.
 */
@ExtendWith(MockitoExtension.class)
class ResultEntryServiceTest {

    @Mock
    private QueryService queryService;
    @Mock
    private CurrentUserContext currentUserContext;

    @InjectMocks
    private ResultEntryService resultEntryService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
    }

    private UpdateResultEntryDTO dto(Set<Result> results) {
        UpdateResultEntryDTO dto = new UpdateResultEntryDTO();
        dto.setScoreboardId("sb-1");
        dto.setSessionId("s-1");
        dto.setResults(results);
        dto.setTotalPoints(0.0);
        return dto;
    }

    private Session pendingSessionWithParticipant(String participantId) {
        Session session = new Session();
        session.setId("s-1");
        session.setIsPending(true);
        session.setIsActive(true);
        session.setParticipants(Set.of(participantId));
        return session;
    }

    private Result result(double points) {
        Result r = new Result();
        r.setPointCategoryId("pc-1");
        r.setPoints(points);
        return r;
    }

    // ---------------------------------------------------------------------
    // createResultEntry
    // ---------------------------------------------------------------------

    @Test
    void createResultEntry_success() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true))
                .thenReturn(Optional.of(pendingSessionWithParticipant("user-1")));
        when(queryService.create(any(ResultEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        ResultEntry result = resultEntryService.createResultEntry(dto(Set.of(result(3.0))));

        assertEquals("sb-1", result.getScoreboardId());
        assertEquals("s-1", result.getSessionId());
        assertEquals("user-1", result.getUserId());
    }

    @Test
    void createResultEntry_throwsWhenSessionNotFound() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.createResultEntry(dto(Set.of())));
        assertEquals("Session not found", ex.getMessage());
    }

    @Test
    void createResultEntry_throwsWhenSessionFinished() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        Session finished = pendingSessionWithParticipant("user-1");
        finished.setIsPending(false);
        when(queryService.findById("s-1", Session.class, true)).thenReturn(Optional.of(finished));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.createResultEntry(dto(Set.of())));
        assertEquals("Session is finished or deleted", ex.getMessage());
    }

    @Test
    void createResultEntry_throwsWhenUserNotParticipant() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true))
                .thenReturn(Optional.of(pendingSessionWithParticipant("someone-else")));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.createResultEntry(dto(Set.of())));
        assertEquals("User is not a participant of this session", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // getResultEntriesByScoreboard / getResultEntriesByUser
    // ---------------------------------------------------------------------

    @Test
    void getResultEntriesByScoreboard_delegatesToQueryService() {
        when(queryService.find(any(Query.class), eq(ResultEntry.class), eq(false)))
                .thenReturn(List.of(new ResultEntry()));

        List<ResultEntry> result = resultEntryService.getResultEntriesByScoreboard("sb-1");

        assertEquals(1, result.size());
    }

    @Test
    void getResultEntriesByUser_delegatesToQueryService() {
        when(queryService.find(any(Query.class), eq(ResultEntry.class), eq(false)))
                .thenReturn(List.of(new ResultEntry(), new ResultEntry()));

        List<ResultEntry> result = resultEntryService.getResultEntriesByUser("user-1");

        assertEquals(2, result.size());
    }

    // ---------------------------------------------------------------------
    // getResultEntryById
    // ---------------------------------------------------------------------

    @Test
    void getResultEntryById_returnsEntry() {
        ResultEntry re = new ResultEntry();
        re.setId("re-1");
        when(queryService.findById("re-1", ResultEntry.class, false)).thenReturn(Optional.of(re));

        ResultEntry result = resultEntryService.getResultEntryById("re-1");

        assertEquals("re-1", result.getId());
    }

    @Test
    void getResultEntryById_throwsWhenMissing() {
        when(queryService.findById("missing", ResultEntry.class, false)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.getResultEntryById("missing"));
        assertEquals("Result entry not found", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // updateResultEntry
    // ---------------------------------------------------------------------

    @Test
    void updateResultEntry_computesTotalPointsAndUpdates() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true))
                .thenReturn(Optional.of(pendingSessionWithParticipant("user-1")));

        ResultEntry updated = new ResultEntry();
        updated.setId("re-1");
        when(queryService.updateById(eq("re-1"), eq(ResultEntry.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<ResultEntry> updater = inv.getArgument(2);
                    updater.update(updated);
                    return Optional.of(updated);
                });

        ResultEntry result = resultEntryService.updateResultEntry(
                "re-1", dto(Set.of(result(2.5), result(4.5))));

        assertEquals("re-1", result.getId());
        assertFalse(result.getIsPending());
        assertEquals(7.0, result.getTotalPoints());
    }

    @Test
    void updateResultEntry_throwsWhenSessionNotFound() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.updateResultEntry("re-1", dto(Set.of())));
    }

    @Test
    void updateResultEntry_throwsWhenUserNotParticipant() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true))
                .thenReturn(Optional.of(pendingSessionWithParticipant("other")));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.updateResultEntry("re-1", dto(Set.of())));
        assertEquals("User is not a participant of this session", ex.getMessage());
    }

    @Test
    void updateResultEntry_throwsWhenEntryNotFound() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.findById("s-1", Session.class, true))
                .thenReturn(Optional.of(pendingSessionWithParticipant("user-1")));
        when(queryService.updateById(eq("re-1"), eq(ResultEntry.class), any()))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> resultEntryService.updateResultEntry("re-1", dto(Set.of(result(1.0)))));
    }

    // ---------------------------------------------------------------------
    // deleteResultEntry
    // ---------------------------------------------------------------------

    @Test
    void deleteResultEntry_delegatesToQueryService() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        ResultEntry deleted = new ResultEntry();
        deleted.setId("re-1");
        when(queryService.deleteById("re-1", ResultEntry.class)).thenReturn(deleted);

        ResultEntry result = resultEntryService.deleteResultEntry("re-1");

        assertEquals("re-1", result.getId());
        verify(queryService).deleteById("re-1", ResultEntry.class);
    }
}
