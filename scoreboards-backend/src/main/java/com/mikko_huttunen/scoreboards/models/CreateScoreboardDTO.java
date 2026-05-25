package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for creating a scoreboard with point categories.
 */
public class CreateScoreboardDTO {
    
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String name;
    
    @NotNull(message = "Point categories cannot be null")
    @NotEmpty(message = "At least one point category is required")
    @Valid
    private List<PointCategoryData> pointCategories = new ArrayList<>();
    
    public static class PointCategoryData {
        @NotBlank(message = "Point category name cannot be blank")
        private String name;
        
        @NotBlank(message = "Color cannot be blank")
        @Pattern(regexp = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", message = "Color must be a valid HEX color code")
        private String color;
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getColor() {
            return color;
        }
        
        public void setColor(String color) {
            this.color = color;
        }
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public List<PointCategoryData> getPointCategories() {
        return pointCategories;
    }
    
    public void setPointCategories(List<PointCategoryData> pointCategories) {
        this.pointCategories = pointCategories;
    }
}

