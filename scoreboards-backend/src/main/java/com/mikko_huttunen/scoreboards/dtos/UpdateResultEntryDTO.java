package com.mikko_huttunen.scoreboards.dtos;

import com.mikko_huttunen.scoreboards.models.Result;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * DTO for updating a result entry with results.
 */
public class UpdateResultEntryDTO {
    
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @NotBlank(message = "Session ID cannot be blank")
    private String sessionId;
    
    @NotNull(message = "Results cannot be null")
    private Set<Result> results = new HashSet<>();

    @NotNull(message = "Total points cannot be null")
    private Double totalPoints;
    
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
    
    public Set<Result> getResults() {
        return results;
    }
    
    public void setResults(Set<Result> results) {
        this.results = results;
    }

    public Double getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Double totalPoints) {
        this.totalPoints = totalPoints;
    }
}

