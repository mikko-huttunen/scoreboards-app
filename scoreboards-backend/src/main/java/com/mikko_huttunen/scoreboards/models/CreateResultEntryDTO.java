package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for creating a new result entry with results.
 */
public class CreateResultEntryDTO {
    
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @NotBlank(message = "Session ID cannot be blank")
    private String sessionId;
    
    @NotNull(message = "Results cannot be null")
    private List<ResultData> results = new ArrayList<>();
    
    public static class ResultData {
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
    
    public String getScoreboardId() {
        return scoreboardId;
    }
    
    public void setScoreboardId(String scoreboardId) {
        this.scoreboardId = scoreboardId;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public List<ResultData> getResults() {
        return results;
    }
    
    public void setResults(List<ResultData> results) {
        this.results = results;
    }
}

