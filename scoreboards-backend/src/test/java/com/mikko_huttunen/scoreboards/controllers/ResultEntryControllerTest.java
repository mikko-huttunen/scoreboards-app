package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.UpdateResultEntryDTO;
import com.mikko_huttunen.scoreboards.models.ResultEntry;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.services.ResultEntryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ResultEntryController}.
 */
@ExtendWith(MockitoExtension.class)
class ResultEntryControllerTest {

    @Mock
    private ResultEntryService resultEntryService;
    @Mock
    private CurrentUserContext currentUserContext;

    @InjectMocks
    private ResultEntryController resultEntryController;

    private UpdateResultEntryDTO dto() {
        UpdateResultEntryDTO dto = new UpdateResultEntryDTO();
        dto.setScoreboardId("sb-1");
        dto.setSessionId("s-1");
        dto.setTotalPoints(0.0);
        return dto;
    }

    @Test
    void createResultEntry_returnsCreated() {
        ResultEntry created = new ResultEntry();
        created.setId("re-1");
        when(resultEntryService.createResultEntry(any(UpdateResultEntryDTO.class))).thenReturn(created);

        ResponseEntity<ResultEntry> response = resultEntryController.createResultEntry(dto());

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("re-1", response.getBody().getId());
    }

    @Test
    void getResultEntriesByScoreboard_returnsOk() {
        when(resultEntryService.getResultEntriesByScoreboard("sb-1")).thenReturn(List.of(new ResultEntry()));

        ResponseEntity<List<ResultEntry>> response =
                resultEntryController.getResultEntriesByScoreboard("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getResultEntriesByUser_returnsOk() {
        User user = new User();
        user.setId("user-1");
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(resultEntryService.getResultEntriesByUser("user-1")).thenReturn(List.of(new ResultEntry()));

        ResponseEntity<List<ResultEntry>> response = resultEntryController.getResultEntriesByUser();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getResultEntryById_returnsOk() {
        ResultEntry re = new ResultEntry();
        re.setId("re-1");
        when(resultEntryService.getResultEntryById("re-1")).thenReturn(re);

        ResponseEntity<ResultEntry> response = resultEntryController.getResultEntryById("re-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("re-1", response.getBody().getId());
    }

    @Test
    void updateResultEntry_returnsOk() {
        ResultEntry updated = new ResultEntry();
        updated.setId("re-1");
        when(resultEntryService.updateResultEntry(eq("re-1"), any(UpdateResultEntryDTO.class)))
                .thenReturn(updated);

        ResponseEntity<ResultEntry> response = resultEntryController.updateResultEntry("re-1", dto());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("re-1", response.getBody().getId());
    }

    @Test
    void deleteResultEntry_returnsOk() {
        ResultEntry deleted = new ResultEntry();
        deleted.setId("re-1");
        when(resultEntryService.deleteResultEntry("re-1")).thenReturn(deleted);

        ResponseEntity<ResultEntry> response = resultEntryController.deleteResultEntry("re-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("re-1", response.getBody().getId());
    }
}
