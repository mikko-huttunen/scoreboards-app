package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Result entity representing a result document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Result")
public class Result extends Auditable {
    
    @Id
    private String id;
    
    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @Field("sessionId")
    @NotBlank(message = "Session ID cannot be blank")
    private String sessionId;
    
    @Field("resultEntryId")
    @NotBlank(message = "Result entry ID cannot be blank")
    private String resultEntryId;
    
    @Field("userId")
    @NotBlank(message = "User ID cannot be blank")
    private String userId;
    
    @Field("pointCategoryId")
    @NotBlank(message = "Point category ID cannot be blank")
    private String pointCategoryId;
    
    @Field("points")
    @NotNull(message = "Points cannot be null")
    private Double points = 0.0;

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

    public String getResultEntryId() {
        return resultEntryId;
    }

    public void setResultEntryId(String resultEntryId) {
        this.resultEntryId = resultEntryId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

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
                "id='" + id + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", sessionId='" + sessionId + '\'' +
                ", resultEntryId='" + resultEntryId + '\'' +
                ", userId='" + userId + '\'' +
                ", pointCategoryId='" + pointCategoryId + '\'' +
                ", points=" + points +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

