package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Result entity representing a result in a ResultEntry entity.
 */
public class Result {
    @NotBlank(message = "Point category ID cannot be blank")
    @Indexed
    private String pointCategoryId;

    @NotNull(message = "Points cannot be null")
    private Double points = 0.0;

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

    @Override
    public String toString() {
        return "Result{" +
                "pointCategoryId='" + pointCategoryId + '\'' +
                ", points=" + points +
                '}';
    }
}

