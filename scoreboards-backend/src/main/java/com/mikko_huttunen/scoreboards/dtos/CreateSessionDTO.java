package com.mikko_huttunen.scoreboards.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.HashSet;
import java.util.Set;

/**
 * DTO for creating a new session.
 */
public class CreateSessionDTO {
    
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String scoreboardName;
    
    @NotNull(message = "Participants cannot be null")
    private Set<String> participants = new HashSet<>();
    
    @NotNull(message = "Point categories cannot be null")
    private Set<String> pointCategories = new HashSet<>();

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

    public Set<String> getParticipants() {
        return participants;
    }

    public void setParticipants(Set<String> participants) {
        this.participants = participants;
    }

    public Set<String> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(Set<String> pointCategories) {
        this.pointCategories = pointCategories;
    }
}

