package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.BeanUtils;
import org.springframework.data.annotation.Id;
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
    private String scoreboardId;
    
    @Field("scoreboardName")
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String scoreboardName;

    @Field("createdByName")
    @NotBlank(message = "Created by name cannot be blank")
    private String createdByName;
    
    @Field("isPending")
    @NotNull(message = "IsPending cannot be null")
    private Boolean isPending = false;
    
    @Field("participants")
    @NotNull(message = "Participants cannot be null")
    private Set<String> participants = new HashSet<>(); // User IDs
    
    @Field("pointCategories")
    @NotNull(message = "Point categories cannot be null")
    private Set<String> pointCategories = new HashSet<>(); // PointCategory IDs
    
    @Field("resultEntries")
    @NotNull(message = "Result entries cannot be null")
    private Set<String> resultEntries = new HashSet<>(); // ResultEntry IDs

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

    public String getScoreboardName() {
        return scoreboardName;
    }

    public void setScoreboardName(String scoreboardName) {
        this.scoreboardName = scoreboardName;
    }

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

    public static class SessionDetails extends Session {

        private List<PointCategory> pointCategoryDetails = new ArrayList<>();
        private List<ResultEntry> resultEntryDetails = new ArrayList<>();

        public SessionDetails() {
        }

        public SessionDetails(Session session) {
            BeanUtils.copyProperties(session, this);
        }

        public List<PointCategory> getPointCategoryDetails() {
            return pointCategoryDetails;
        }

        public void setPointCategoryDetails(List<PointCategory> pointCategoryDetails) {
            this.pointCategoryDetails = pointCategoryDetails;
        }

        public List<ResultEntry> getResultEntryDetails() {
            return resultEntryDetails;
        }

        public void setResultEntryDetails(List<ResultEntry> resultEntryDetails) {
            this.resultEntryDetails = resultEntryDetails;
        }
    }
}

