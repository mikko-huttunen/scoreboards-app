package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.enums.StatType;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.ScoreboardSettings;
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
 * Unit tests for {@link ScoreboardService}.
 */
@ExtendWith(MockitoExtension.class)
class ScoreboardServiceTest {

    @Mock
    private QueryService queryService;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private PointCategoryService pointCategoryService;
    @Mock
    private SessionService sessionService;
    @Mock
    private HistoryEventService historyEventService;

    @InjectMocks
    private ScoreboardService scoreboardService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setName("Alice");
    }

    private PointCategoryDTO pcDto(String id, String name, String color) {
        PointCategoryDTO dto = new PointCategoryDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setColor(color);
        return dto;
    }

    private Membership membership(String scoreboardId) {
        Membership m = new Membership();
        m.setScoreboardId(scoreboardId);
        m.setUserId("user-1");
        return m;
    }

    private ScoreboardSettings settingsWith(StatType... statTypes) {
        ScoreboardSettings settings = new ScoreboardSettings();
        settings.setStatTypes(List.of(statTypes));
        settings.setDefaultStatType(statTypes.length > 0 ? statTypes[0] : StatType.TOTAL);
        return settings;
    }

    // ---------------------------------------------------------------------
    // createScoreboard
    // ---------------------------------------------------------------------

    @Test
    void createScoreboard_createsMembershipPointCategoriesAndScoreboard() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.create(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));
        when(queryService.create(any(Scoreboard.class))).thenAnswer(inv -> inv.getArgument(0));

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setName("  My Board  ");
        dto.setPointCategories(List.of(pcDto(null, "Goals", "#FFFFFF")));
        dto.setSettings(settingsWith(StatType.TOTAL, StatType.AVERAGE));

        Scoreboard result = scoreboardService.createScoreboard(dto);

        assertNotNull(result.getId());
        assertEquals("My Board", result.getName());
        assertNotNull(result.getSettings());
        assertEquals(List.of(StatType.TOTAL, StatType.AVERAGE), result.getSettings().getStatTypes());

        ArgumentCaptor<Membership> membershipCaptor = ArgumentCaptor.forClass(Membership.class);
        verify(queryService).create(membershipCaptor.capture());
        Membership created = membershipCaptor.getValue();
        assertEquals("user-1", created.getUserId());
        assertEquals(result.getId(), created.getScoreboardId());

        ArgumentCaptor<Scoreboard> scoreboardCaptor = ArgumentCaptor.forClass(Scoreboard.class);
        verify(queryService).create(scoreboardCaptor.capture());
        assertEquals(List.of(StatType.TOTAL, StatType.AVERAGE),
                scoreboardCaptor.getValue().getSettings().getStatTypes());

        verify(pointCategoryService).createPointCategories(eq(dto.getPointCategories()), eq(result.getId()));
    }

    // ---------------------------------------------------------------------
    // getScoreboardsByUser
    // ---------------------------------------------------------------------

    @Test
    void getScoreboardsByUser_returnsEmptyWhenNoMemberships() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        List<Scoreboard> result = scoreboardService.getScoreboardsByUser();

        assertTrue(result.isEmpty());
        verify(queryService, never()).fetchScoreboardsWithPartialData(anySet());
    }

    @Test
    void getScoreboardsByUser_returnsEmptyWhenFetchEmpty() {
        user.getMemberships().add(membership("sb-1"));
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.fetchScoreboardsWithPartialData(anySet())).thenReturn(Optional.empty());

        List<Scoreboard> result = scoreboardService.getScoreboardsByUser();

        assertTrue(result.isEmpty());
    }

    @Test
    void getScoreboardsByUser_returnsScoreboards() {
        user.getMemberships().add(membership("sb-1"));
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setSettings(settingsWith(StatType.TOTAL));
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.fetchScoreboardsWithPartialData(anySet())).thenReturn(Optional.of(List.of(sb)));

        List<Scoreboard> result = scoreboardService.getScoreboardsByUser();

        assertEquals(1, result.size());
        assertEquals("sb-1", result.get(0).getId());
        assertEquals(List.of(StatType.TOTAL), result.get(0).getSettings().getStatTypes());
    }

    // ---------------------------------------------------------------------
    // getScoreboardWithData
    // ---------------------------------------------------------------------

    @Test
    void getScoreboardWithData_returnsScoreboard() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setSettings(settingsWith(StatType.TOTAL, StatType.AVERAGE));
        when(queryService.fetchScoreboardWithData("sb-1")).thenReturn(Optional.of(sb));

        Scoreboard result = scoreboardService.getScoreboardWithData("sb-1");

        assertEquals("sb-1", result.getId());
        assertEquals(List.of(StatType.TOTAL, StatType.AVERAGE), result.getSettings().getStatTypes());
    }

    @Test
    void getScoreboardWithData_throwsWhenMissing() {
        when(queryService.fetchScoreboardWithData("missing")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.getScoreboardWithData("missing"));
        assertEquals("Scoreboard not found", ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // getScoreboardById
    // ---------------------------------------------------------------------

    @Test
    void getScoreboardById_returnsFirstScoreboard() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setSettings(settingsWith(StatType.TOTAL));
        when(queryService.fetchScoreboardsWithPartialData(Set.of("sb-1")))
                .thenReturn(Optional.of(List.of(sb)));

        Scoreboard result = scoreboardService.getScoreboardById("sb-1");

        assertEquals("sb-1", result.getId());
        assertEquals(List.of(StatType.TOTAL), result.getSettings().getStatTypes());
    }

    @Test
    void getScoreboardById_throwsWhenMissing() {
        when(queryService.fetchScoreboardsWithPartialData(Set.of("missing")))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.getScoreboardById("missing"));
    }

    // ---------------------------------------------------------------------
    // updateScoreboard
    // ---------------------------------------------------------------------

    @Test
    void updateScoreboard_throwsWhenPendingSessionsExist() {
        Session pending = new Session();
        when(sessionService.getPendingSessionsByScoreboardId("sb-1")).thenReturn(List.of(pending));

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setName("New");
        dto.setPointCategories(List.of()); // keep existing test style; validation is not executed here
        dto.setSettings(settingsWith(StatType.TOTAL));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.updateScoreboard("sb-1", dto));
        assertEquals("Cannot update scoreboard with pending sessions", ex.getMessage());
        verify(queryService, never()).updateById(anyString(), any(), any());
    }

    @Test
    void updateScoreboard_createsUpdatesAndDeletesCategoriesAndUpdatesSettings() {
        when(sessionService.getPendingSessionsByScoreboardId("sb-1")).thenReturn(List.of());

        PointCategory existing1 = new PointCategory();
        existing1.setId("pc-existing-keep");
        PointCategory existing2 = new PointCategory();
        existing2.setId("pc-existing-remove");
        when(pointCategoryService.getPointCategoriesByScoreboardId("sb-1"))
                .thenReturn(List.of(existing1, existing2));

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setName("  Updated Name  ");
        dto.setSettings(settingsWith(StatType.AVERAGE));
        dto.setPointCategories(List.of(
                pcDto("pc-existing-keep", "Keep", "#111111"),
                pcDto(null, "Brand New", "#222222")
        ));

        Scoreboard updated = new Scoreboard();
        updated.setId("sb-1");
        updated.setName("Updated Name");
        updated.setSettings(settingsWith(StatType.AVERAGE));

        when(queryService.updateById(eq("sb-1"), eq(Scoreboard.class), any()))
                .thenReturn(Optional.of(updated));

        Scoreboard result = scoreboardService.updateScoreboard("sb-1", dto);

        assertEquals("sb-1", result.getId());
        assertNotNull(result.getSettings());
        assertEquals(List.of(StatType.AVERAGE), result.getSettings().getStatTypes());

        ArgumentCaptor<List<PointCategoryDTO>> createCaptor = captorForList();
        verify(pointCategoryService).createPointCategories(createCaptor.capture(), eq("sb-1"));
        assertEquals(1, createCaptor.getValue().size());
        assertEquals("Brand New", createCaptor.getValue().get(0).getName());

        ArgumentCaptor<List<PointCategoryDTO>> updateCaptor = captorForList();
        verify(pointCategoryService).updatePointCategories(updateCaptor.capture(), eq("sb-1"));
        assertEquals(1, updateCaptor.getValue().size());
        assertEquals("pc-existing-keep", updateCaptor.getValue().get(0).getId());

        verify(pointCategoryService).deletePointCategories(Set.of("pc-existing-remove"));
    }

    @Test
    void updateScoreboard_throwsWhenScoreboardNotFoundAfterUpdate() {
        when(sessionService.getPendingSessionsByScoreboardId("sb-1")).thenReturn(List.of());
        when(pointCategoryService.getPointCategoriesByScoreboardId("sb-1")).thenReturn(List.of());
        when(queryService.updateById(eq("sb-1"), eq(Scoreboard.class), any()))
                .thenReturn(Optional.empty());

        ScoreboardDTO dto = new ScoreboardDTO();
        dto.setName("Name");
        dto.setPointCategories(List.of());
        dto.setSettings(settingsWith(StatType.TOTAL));

        assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.updateScoreboard("sb-1", dto));
    }

    // ---------------------------------------------------------------------
    // deleteScoreboards
    // ---------------------------------------------------------------------

    @Test
    void deleteScoreboards_throwsWhenPendingSessions() {
        when(sessionService.getPendingSessionsByScoreboardId("sb-1")).thenReturn(List.of(new Session()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.deleteScoreboards(Set.of("sb-1")));
        assertEquals("Cannot delete scoreboard with pending sessions", ex.getMessage());
    }

    @Test
    void deleteScoreboards_deletesScoreboardAndRelatedData() {
        when(sessionService.getPendingSessionsByScoreboardId("sb-1")).thenReturn(List.of());

        Scoreboard deleted = new Scoreboard();
        deleted.setId("sb-1");
        deleted.setSettings(settingsWith(StatType.TOTAL));
        when(queryService.deleteAll(Set.of("sb-1"), Scoreboard.class)).thenReturn(List.of(deleted));

        List<Scoreboard> result = scoreboardService.deleteScoreboards(Set.of("sb-1"));

        assertEquals(1, result.size());
        verify(queryService, times(5)).delete(any(Query.class), any());
    }

    // ---------------------------------------------------------------------
    // leaveScoreboard
    // ---------------------------------------------------------------------

    @Test
    void leaveScoreboard_throwsWhenParticipatingInSession() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-1")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.leaveScoreboard("sb-1"));
        assertEquals("Cannot leave scoreboard when participating in a session", ex.getMessage());
    }

    @Test
    void leaveScoreboard_deletesMembership() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-1")).thenReturn(false);
        when(queryService.delete(any(Query.class), eq(Membership.class))).thenReturn(List.of(new Membership()));

        boolean result = scoreboardService.leaveScoreboard("sb-1");

        assertTrue(result);
        verify(queryService).delete(any(Query.class), eq(Membership.class));
    }

    // ---------------------------------------------------------------------
    // removeUserFromScoreboard
    // ---------------------------------------------------------------------

    @Test
    void removeUserFromScoreboard_throwsWhenTargetParticipating() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-2")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.removeUserFromScoreboard("sb-1", "user-2"));
        assertEquals("Cannot remove user from scoreboard when participating in a session", ex.getMessage());
    }

    @Test
    void removeUserFromScoreboard_throwsWhenRemovingSelf() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-1")).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.removeUserFromScoreboard("sb-1", "user-1"));
        assertEquals("Cannot remove yourself from a scoreboard", ex.getMessage());
    }

    @Test
    void removeUserFromScoreboard_throwsWhenNotCreator() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-2")).thenReturn(false);

        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setCreatedBy("someone-else");
        sb.setSettings(settingsWith(StatType.TOTAL));
        when(queryService.fetchScoreboardsWithPartialData(Set.of("sb-1")))
                .thenReturn(Optional.of(List.of(sb)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> scoreboardService.removeUserFromScoreboard("sb-1", "user-2"));
        assertEquals("Only the creator can remove users from a scoreboard", ex.getMessage());
    }

    @Test
    void removeUserFromScoreboard_removesMembershipWhenCreator() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(sessionService.isUserParticipatingInSession("sb-1", "user-2")).thenReturn(false);

        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        sb.setCreatedBy("user-1");
        sb.setSettings(settingsWith(StatType.TOTAL));
        when(queryService.fetchScoreboardsWithPartialData(Set.of("sb-1")))
                .thenReturn(Optional.of(List.of(sb)));
        when(queryService.delete(any(Query.class), eq(Membership.class))).thenReturn(List.of(new Membership()));

        boolean result = scoreboardService.removeUserFromScoreboard("sb-1", "user-2");

        assertTrue(result);
        verify(queryService).delete(any(Query.class), eq(Membership.class));
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<List<PointCategoryDTO>> captorForList() {
        return (ArgumentCaptor<List<PointCategoryDTO>>) (ArgumentCaptor<?>) ArgumentCaptor.forClass(List.class);
    }
}