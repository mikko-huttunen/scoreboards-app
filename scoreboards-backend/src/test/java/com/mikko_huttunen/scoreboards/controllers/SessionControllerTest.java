package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.CreateSessionDTO;
import com.mikko_huttunen.scoreboards.dtos.ResolveTieDTO;
import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.dtos.UpdateSessionDTO;
import com.mikko_huttunen.scoreboards.models.Result;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.services.SessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SessionController}.
 */
@ExtendWith(MockitoExtension.class)
class SessionControllerTest {

    @Mock
    private SessionService sessionService;

    @InjectMocks
    private SessionController sessionController;

    @Test
    void createSession_returnsCreated() {
        CreateSessionDTO dto = new CreateSessionDTO();
        dto.setScoreboardId("sb-1");
        dto.setName("Night");
        dto.setDescription("c");
        dto.setParticipants(Set.of("user-1"));
        dto.setPointCategories(Set.of("pc-1"));

        Session session = new Session();
        session.setId("s-1");
        when(sessionService.createSession("sb-1", "Night", "c", Set.of("user-1"), Set.of("pc-1")))
                .thenReturn(session);

        ResponseEntity<Session> response = sessionController.createSession(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
    }

    @Test
    void getSessionsByScoreboardId_returnsOk() {
        when(sessionService.getSessionsByScoreboardId("sb-1", true)).thenReturn(List.of(new SessionDTO()));

        ResponseEntity<List<SessionDTO>> response = sessionController.getSessionsByScoreboardId("sb-1", true);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getSessionsByScoreboardId_passesIsPendingThrough() {
        when(sessionService.getSessionsByScoreboardId("sb-1", false)).thenReturn(List.of());

        ResponseEntity<List<SessionDTO>> response = sessionController.getSessionsByScoreboardId("sb-1", false);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
        verify(sessionService).getSessionsByScoreboardId("sb-1", false);
    }

    @Test
    void getSessionById_returnsOk() {
        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        when(sessionService.getSessionById("s-1")).thenReturn(dto);

        ResponseEntity<SessionDTO> response = sessionController.getSessionById("s-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
    }

    @Test
    void updateSession_returnsOk() {
        UpdateSessionDTO dto = new UpdateSessionDTO();
        dto.setName("Session test");
        dto.setComment("test comment");

        UpdateSessionDTO.ResultEntryUpdateDTO resultEntry = new UpdateSessionDTO.ResultEntryUpdateDTO();
        resultEntry.setId("re-1");
        resultEntry.setUserId("user-1");

        Result result = new Result();
        result.setPointCategoryId("pc-1");
        result.setPoints(12.0);
        resultEntry.setResults(Set.of(result));

        dto.setResultEntries(List.of(resultEntry));

        SessionDTO updated = new SessionDTO();
        updated.setId("s-1");

        when(sessionService.updateSession(eq("s-1"), any(UpdateSessionDTO.class))).thenReturn(updated);

        ResponseEntity<SessionDTO> response = sessionController.updateSession("s-1", dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
        verify(sessionService).updateSession(eq("s-1"), any(UpdateSessionDTO.class));
    }

    @Test
    void deleteSession_returnsOkWithFirstDeleted() {
        Session session = new Session();
        session.setId("s-1");
        when(sessionService.deleteSessions(Set.of("s-1"))).thenReturn(List.of(session));

        ResponseEntity<Session> response = sessionController.deleteSession("s-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
    }

    @Test
    void finishSession_returnsOk() {
        Session session = new Session();
        session.setId("s-1");
        when(sessionService.finishSession("s-1")).thenReturn(session);

        ResponseEntity<Session> response = sessionController.finishSession("s-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
    }

    @Test
    void resolveTieWinner_returnsOk() {
        SessionDTO updated = new SessionDTO();
        updated.setId("s-1");
        updated.setTieWinner("user-2");
        updated.setIsTieResolved(true);
        when(sessionService.resolveTieWinner("s-1", "user-2")).thenReturn(updated);

        ResolveTieDTO dto = new ResolveTieDTO();
        dto.setTieWinner("user-2");

        ResponseEntity<SessionDTO> response = sessionController.resolveTieWinner("s-1", dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("user-2", response.getBody().getTieWinner());
        assertTrue(response.getBody().getIsTieResolved());
        verify(sessionService).resolveTieWinner("s-1", "user-2");
    }
}