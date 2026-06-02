package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for updating a result entry with results.
 */
public class UpdateResultEntryDTO {
    
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @NotBlank(message = "Session ID cannot be blank")
    private String sessionId;
    
    @NotNull(message = "Results cannot be null")
    private List<UpdateResultDTO> results = new ArrayList<>();
    
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
    
    public List<UpdateResultDTO> getResults() {
        return results;
    }
    
    public void setResults(List<UpdateResultDTO> results) {
        this.results = results;
    }
}

