package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.enums.StatType;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.ScoreboardSettings;
import com.mikko_huttunen.scoreboards.services.ScoreboardService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ScoreboardController}.
 */
@ExtendWith(MockitoExtension.class)
class ScoreboardControllerTest {

    @Mock
    private ScoreboardService scoreboardService;

    @InjectMocks
    private ScoreboardController scoreboardController;

    @Test
    void createScoreboard_returnsCreated() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        ScoreboardSettings settings = new ScoreboardSettings();
        settings.setStatTypes(List.of(StatType.TOTAL));
        settings.setDefaultStatType(StatType.TOTAL);
        sb.setSettings(settings);

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setSettings(new ScoreboardSettings());
        dto.getSettings().setStatTypes(List.of(StatType.TOTAL));
        dto.getSettings().setDefaultStatType(StatType.TOTAL);

        when(scoreboardService.createScoreboard(any(ScoreboardDTO.class))).thenReturn(sb);

        ResponseEntity<Scoreboard> response = scoreboardController.createScoreboard(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("sb-1", response.getBody().getId());
        assertEquals(List.of(StatType.TOTAL), response.getBody().getSettings().getStatTypes());
    }

    @Test
    void getScoreboardsByCurrentUser_returnsOk() {
        Scoreboard sb = new Scoreboard();
        ScoreboardSettings settings = new ScoreboardSettings();
        settings.setStatTypes(List.of(StatType.TOTAL));
        settings.setDefaultStatType(StatType.TOTAL);
        sb.setSettings(settings);

        when(scoreboardService.getScoreboardsByUser()).thenReturn(List.of(sb));

        ResponseEntity<List<Scoreboard>> response = scoreboardController.getScoreboardsByCurrentUser();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(List.of(StatType.TOTAL), response.getBody().get(0).getSettings().getStatTypes());
    }

    @Test
    void getScoreboardWithData_returnsOk() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        ScoreboardSettings settings = new ScoreboardSettings();
        settings.setStatTypes(List.of(StatType.TOTAL, StatType.AVERAGE));
        settings.setDefaultStatType(StatType.TOTAL);
        sb.setSettings(settings);

        when(scoreboardService.getScoreboardWithData("sb-1")).thenReturn(sb);

        ResponseEntity<Scoreboard> response = scoreboardController.getScoreboardWithData("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("sb-1", response.getBody().getId());
        assertEquals(List.of(StatType.TOTAL, StatType.AVERAGE), response.getBody().getSettings().getStatTypes());
    }

    @Test
    void updateScoreboard_returnsOk() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        ScoreboardSettings settings = new ScoreboardSettings();
        settings.setStatTypes(List.of(StatType.AVERAGE));
        settings.setDefaultStatType(StatType.AVERAGE);
        sb.setSettings(settings);

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setSettings(new ScoreboardSettings());
        dto.getSettings().setStatTypes(List.of(StatType.AVERAGE));
        dto.getSettings().setDefaultStatType(StatType.AVERAGE);

        when(scoreboardService.updateScoreboard(eq("sb-1"), any(ScoreboardDTO.class))).thenReturn(sb);

        ResponseEntity<Scoreboard> response =
                scoreboardController.updateScoreboard("sb-1", dto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("sb-1", response.getBody().getId());
        assertEquals(List.of(StatType.AVERAGE), response.getBody().getSettings().getStatTypes());
    }

    @Test
    void deleteScoreboard_returnsOkWithFirstDeleted() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        when(scoreboardService.deleteScoreboards(Set.of("sb-1"))).thenReturn(List.of(sb));

        ResponseEntity<Scoreboard> response = scoreboardController.deleteScoreboard("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("sb-1", response.getBody().getId());
    }

    @Test
    void leaveScoreboard_returnsNoContent() {
        when(scoreboardService.leaveScoreboard("sb-1")).thenReturn(true);

        ResponseEntity<Void> response = scoreboardController.leaveScoreboard("sb-1");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(scoreboardService).leaveScoreboard("sb-1");
    }

    @Test
    void removeUserFromScoreboard_returnsNoContent() {
        when(scoreboardService.removeUserFromScoreboard("sb-1", "user-2")).thenReturn(true);

        ResponseEntity<Void> response = scoreboardController.removeUserFromScoreboard("sb-1", "user-2");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(scoreboardService).removeUserFromScoreboard("sb-1", "user-2");
    }
}