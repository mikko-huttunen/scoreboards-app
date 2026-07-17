package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.services.PointCategoryService;
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
 * Unit tests for {@link PointCategoryController}.
 */
@ExtendWith(MockitoExtension.class)
class PointCategoryControllerTest {

    @Mock
    private PointCategoryService pointCategoryService;

    @InjectMocks
    private PointCategoryController pointCategoryController;

    @Test
    void getPointCategoriesByScoreboardId_returnsOk() {
        PointCategory pc = new PointCategory();
        pc.setId("pc-1");
        when(pointCategoryService.getPointCategoriesByScoreboardId("sb-1")).thenReturn(List.of(pc));

        ResponseEntity<List<PointCategory>> response =
                pointCategoryController.getPointCategoriesByScoreboardId("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getPointCategoryById_returnsOk() {
        PointCategory pc = new PointCategory();
        pc.setId("pc-1");
        when(pointCategoryService.getPointCategoryById("pc-1")).thenReturn(pc);

        ResponseEntity<PointCategory> response = pointCategoryController.getPointCategoryById("pc-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("pc-1", response.getBody().getId());
    }
}
