package com.mikko_huttunen.scoreboards.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for creating a scoreboard with point categories.
 */
public class ScoreboardDTO {

    @NotBlank(message = "Scoreboard name cannot be blank")
    private String name;

    @NotNull(message = "Point categories cannot be null")
    @NotEmpty(message = "At least one point category is required")
    @Valid
    private List<PointCategoryDTO> pointCategories = new ArrayList<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<PointCategoryDTO> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(List<PointCategoryDTO> pointCategories) {
        this.pointCategories = pointCategories;
    }
}