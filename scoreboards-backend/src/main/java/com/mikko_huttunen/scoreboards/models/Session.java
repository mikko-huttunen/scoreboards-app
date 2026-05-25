package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Session entity representing a session document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Session")
public class Session extends Auditable {
    
    @Id
    private String id;
    
    @Field("createdById")
    @NotBlank(message = "Created by ID cannot be blank")
    private String createdById;
    
    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @Field("scoreboardName")
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String scoreboardName;
    
    @Field("isPending")
    @NotNull(message = "IsPending cannot be null")
    private Boolean isPending = false;
    
    @Field("participants")
    @NotNull(message = "Participants cannot be null")
    private List<String> participants = new ArrayList<>(); // User IDs
    
    @Field("pointCategories")
    @NotNull(message = "Point categories cannot be null")
    private List<String> pointCategories = new ArrayList<>(); // PointCategory IDs
    
    @Field("resultEntries")
    @NotNull(message = "Result entries cannot be null")
    private List<String> resultEntries = new ArrayList<>(); // ResultEntry IDs

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCreatedById() {
        return createdById;
    }

    public void setCreatedById(String createdById) {
        this.createdById = createdById;
    }

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

    public Boolean getIsPending() {
        return isPending;
    }

    public void setIsPending(Boolean isPending) {
        this.isPending = isPending;
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

    public List<String> getResultEntries() {
        return resultEntries;
    }

    public void setResultEntries(List<String> resultEntries) {
        this.resultEntries = resultEntries;
    }

    @Override
    public String toString() {
        return "Session{" +
                "id='" + id + '\'' +
                ", createdById='" + createdById + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", scoreboardName='" + scoreboardName + '\'' +
                ", isPending=" + isPending +
                ", participants=" + participants +
                ", pointCategories=" + pointCategories +
                ", resultEntries=" + resultEntries +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

