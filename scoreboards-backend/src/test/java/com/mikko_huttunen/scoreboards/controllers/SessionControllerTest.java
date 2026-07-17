package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.CreateSessionDTO;
import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.dtos.UpdateSessionDTO;
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
import static org.mockito.ArgumentMatchers.*;
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
        dto.setComment("c");
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
        when(sessionService.getSessionsByScoreboardId("sb-1")).thenReturn(List.of(new Session()));

        ResponseEntity<List<Session>> response = sessionController.getSessionsByScoreboardId("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
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
        dto.setPending(false);
        dto.setParticipants(Set.of("user-1"));
        dto.setPointCategories(Set.of("pc-1"));
        dto.setResultEntries(Set.of("re-1"));

        Session session = new Session();
        session.setId("s-1");
        when(sessionService.updateSession("s-1", false, Set.of("user-1"), Set.of("pc-1"), Set.of("re-1")))
                .thenReturn(session);

        ResponseEntity<Session> response = sessionController.updateSession("s-1", dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("s-1", response.getBody().getId());
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
}
