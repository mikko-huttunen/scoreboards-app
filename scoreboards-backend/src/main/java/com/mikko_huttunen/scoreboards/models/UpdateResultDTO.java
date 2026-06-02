package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateResultDTO {
    @NotBlank(message = "Point category ID cannot be blank")
    private String pointCategoryId;

    @NotNull(message = "Points cannot be null")
    private Double points;

    public String getPointCategoryId() {
        return pointCategoryId;
    }

    public void setPointCategoryId(String pointCategoryId) {
        this.pointCategoryId = pointCategoryId;
    }

    public Double getPoints() {
        return points;
    }

    public void setPoints(Double points) {
        this.points = points;
    }
}
