package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for creating a new session.
 */
public class CreateSessionDTO {
    
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String scoreboardName;
    
    @NotNull(message = "Participants cannot be null")
    private List<String> participants = new ArrayList<>();
    
    @NotNull(message = "Point categories cannot be null")
    private List<String> pointCategories = new ArrayList<>();

    public String getScoreboardId() {
        return scoreboardId;
    }

    public void setScoreboardId(String scoreboardId) {
        this.scoreboardId = scoreboardId;
    }

    public String getScoreboardName() {
        return scoreboardName;
    }

    public void setScoreboardName(String scoreboardName) {
        this.scoreboardName = scoreboardName;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public List<String> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(List<String> pointCategories) {
        this.pointCategories = pointCategories;
    }
}

