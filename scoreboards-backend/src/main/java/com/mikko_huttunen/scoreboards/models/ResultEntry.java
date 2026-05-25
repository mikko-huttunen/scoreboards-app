package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

/**
 * ResultEntry entity representing a result entry document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("ResultEntry")
public class ResultEntry extends Auditable {
    
    @Id
    private String id;
    
    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @Field("sessionId")
    @NotBlank(message = "Session ID cannot be blank")
    private String sessionId;
    
    @Field("userId")
    @NotBlank(message = "User ID cannot be blank")
    private String userId;
    
    @Field("results")
    @NotNull(message = "Results cannot be null")
    private List<String> results = new ArrayList<>(); // Result IDs

    @Field("totalPoints")
    @NotNull(message = "Total points cannot be null")
    private Double totalPoints = 0.0;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<String> getResults() {
        return results;
    }

    public void setResults(List<String> results) {
        this.results = results;
    }

    public Double getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Double totalPoints) {
        this.totalPoints = totalPoints;
    }

    @Override
    public String toString() {
        return "ResultEntry{" +
                "id='" + id + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", sessionId='" + sessionId + '\'' +
                ", userId='" + userId + '\'' +
                ", results=" + results +
                ", totalPoints=" + totalPoints +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

