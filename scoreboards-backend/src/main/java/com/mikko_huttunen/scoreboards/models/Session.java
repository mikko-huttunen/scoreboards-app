package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.BeanUtils;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.*;

/**
 * Session entity representing a session document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Session")
public class Session extends Auditable {
    
    @Id
    private String id;
    
    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    @Indexed
    private String scoreboardId;

    @Field("name")
    @NotBlank(message = "Name cannot be blank")
    private String name;

    @Field("comment")
    private String comment;

    private String createdByName;
    
    @Field("isPending")
    @NotNull(message = "IsPending cannot be null")
    private Boolean isPending = false;
    
    @Field("participants")
    @NotEmpty(message = "Participants cannot be empty")
    private Set<String> participants = new HashSet<>();
    
    @Field("pointCategories")
    @NotEmpty(message = "Point categories cannot be empty")
    private Set<String> pointCategories = new HashSet<>();
    
    @Field("resultEntries")
    private Set<String> resultEntries = new HashSet<>();

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

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public String getComment() { return comment; }

    public void setComment(String comment) { this.comment = comment; }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }

    public Boolean getIsPending() {
        return isPending;
    }

    public void setIsPending(Boolean isPending) {
        this.isPending = isPending;
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

    public Set<String> getResultEntries() {
        return resultEntries;
    }

    public void setResultEntries(Set<String> resultEntries) {
        this.resultEntries = resultEntries;
    }

    @Override
    public String toString() {
        return "Session{" +
                "id='" + id + '\'' +
                ", type='" + getType() + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", name='" + name + '\'' +
                ", comment='" + comment + '\'' +
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

