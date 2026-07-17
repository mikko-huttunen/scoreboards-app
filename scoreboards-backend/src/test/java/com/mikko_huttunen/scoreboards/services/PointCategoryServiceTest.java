package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.models.PointCategory;
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
 * Unit tests for {@link PointCategoryService}.
 */
@ExtendWith(MockitoExtension.class)
class PointCategoryServiceTest {

    @Mock
    private QueryService queryService;

    @InjectMocks
    private PointCategoryService pointCategoryService;

    private PointCategoryDTO dto(String id, String name, String color) {
        PointCategoryDTO dto = new PointCategoryDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setColor(color);
        return dto;
    }

    @Test
    void createPointCategories_trimsFieldsAndPersists() {
        List<PointCategoryDTO> dtos = List.of(
                dto(null, "  Goals  ", "  #FFFFFF  "),
                dto(null, "Assists", "#000000")
        );
        when(queryService.create(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<PointCategory> result = pointCategoryService.createPointCategories(dtos, "sb-1");

        assertEquals(2, result.size());
        assertEquals("Goals", result.get(0).getName());
        assertEquals("#FFFFFF", result.get(0).getColor());
        assertEquals("sb-1", result.get(0).getScoreboardId());
        assertEquals("Assists", result.get(1).getName());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PointCategory>> captor =
                (ArgumentCaptor<List<PointCategory>>) (ArgumentCaptor<?>) ArgumentCaptor.forClass(List.class);

        verify(queryService).create(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    void getPointCategoriesByScoreboardId_delegatesToQueryService() {
        PointCategory pc = new PointCategory();
        pc.setId("pc-1");
        when(queryService.find(any(Query.class), eq(PointCategory.class), eq(false)))
                .thenReturn(List.of(pc));

        List<PointCategory> result = pointCategoryService.getPointCategoriesByScoreboardId("sb-1");

        assertEquals(1, result.size());
        assertEquals("pc-1", result.get(0).getId());
        verify(queryService).find(any(Query.class), eq(PointCategory.class), eq(false));
    }

    @Test
    void getPointCategoryById_returnsWhenPresent() {
        PointCategory pc = new PointCategory();
        pc.setId("pc-1");
        when(queryService.findById("pc-1", PointCategory.class, false)).thenReturn(Optional.of(pc));

        PointCategory result = pointCategoryService.getPointCategoryById("pc-1");

        assertEquals("pc-1", result.getId());
    }

    @Test
    void getPointCategoryById_throwsWhenMissing() {
        when(queryService.findById("missing", PointCategory.class, false)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> pointCategoryService.getPointCategoryById("missing"));
        assertEquals("Point category not found", ex.getMessage());
    }

    @Test
    void updatePointCategories_appliesUpdaterToMatchingCategory() {
        List<PointCategoryDTO> dtos = List.of(dto("pc-1", "  New Name  ", "  #ABCDEF  "));
        when(queryService.updateAll(anySet(), eq(PointCategory.class), any()))
                .thenReturn(List.of(new PointCategory()));

        pointCategoryService.updatePointCategories(dtos, "sb-9");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<String>> idsCaptor =
                (ArgumentCaptor<Set<String>>) (ArgumentCaptor<?>) ArgumentCaptor.forClass(Set.class);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<QueryService.DocumentUpdater<PointCategory>> updaterCaptor =
                (ArgumentCaptor<QueryService.DocumentUpdater<PointCategory>>) (ArgumentCaptor<?>)
                        ArgumentCaptor.forClass(QueryService.DocumentUpdater.class);

        verify(queryService).updateAll(idsCaptor.capture(), eq(PointCategory.class), updaterCaptor.capture());

        assertTrue(idsCaptor.getValue().contains("pc-1"));

        PointCategory target = new PointCategory();
        target.setId("pc-1");
        updaterCaptor.getValue().update(target);
        assertEquals("New Name", target.getName());
        assertEquals("#ABCDEF", target.getColor());
        assertEquals("sb-9", target.getScoreboardId());
    }

    @Test
    void updatePointCategories_updaterIgnoresNonMatchingCategory() {
        List<PointCategoryDTO> dtos = List.of(dto("pc-1", "New Name", "#ABCDEF"));
        when(queryService.updateAll(anySet(), eq(PointCategory.class), any()))
                .thenReturn(List.of());

        pointCategoryService.updatePointCategories(dtos, "sb-9");

        ArgumentCaptor<QueryService.DocumentUpdater<PointCategory>> updaterCaptor =
                ArgumentCaptor.forClass(QueryService.DocumentUpdater.class);
        verify(queryService).updateAll(anySet(), eq(PointCategory.class), updaterCaptor.capture());

        // A category not in the DTO list must be left untouched
        PointCategory other = new PointCategory();
        other.setId("pc-other");
        other.setName("Original");
        updaterCaptor.getValue().update(other);
        assertEquals("Original", other.getName());
    }

    @Test
    void deletePointCategories_delegatesToQueryService() {
        Set<String> ids = Set.of("pc-1", "pc-2");
        when(queryService.deleteAll(ids, PointCategory.class)).thenReturn(List.of(new PointCategory()));

        List<PointCategory> result = pointCategoryService.deletePointCategories(ids);

        assertEquals(1, result.size());
        verify(queryService).deleteAll(ids, PointCategory.class);
    }
}
