package com.mikko_huttunen.scoreboards.models;

import com.fasterxml.jackson.annotation.JsonInclude;
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

    @Field("description")
    private String description;

    private String createdByName;
    
    @Field("isPending")
    @NotNull(message = "IsPending cannot be null")
    private Boolean isPending = false;

    @Field("finishedAt")
    @Indexed
    private Date finishedAt;

    /**
     * When the session was last edited after it had already finished. Null while a finished
     * session has never been edited.
     */
    @Field("editedAt")
    private Date editedAt;
    
    @Field("participants")
    @NotEmpty(message = "Participants cannot be empty")
    private Set<String> participants = new HashSet<>();
    
    @Field("pointCategories")
    @NotEmpty(message = "Point categories cannot be empty")
    private Set<String> pointCategories = new HashSet<>();
    
    @Field("resultEntries")
    private Set<String> resultEntries = new HashSet<>();

    /**
     * False while the session's top total points are shared by two or more participants and
     * no tie breaker winner has been picked. True when there is no tie, or the tie was resolved.
     */
    @Field("isTieResolved")
    private Boolean isTieResolved = true;

    /**
     * User ID of the participant chosen as the winner of a tie breaker. Null when no tie was broken.
     */
    @Field("tieWinner")
    private String tieWinner;

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

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

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

    public Date getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Date finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Date getEditedAt() {
        return editedAt;
    }

    public void setEditedAt(Date editedAt) {
        this.editedAt = editedAt;
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

    public Boolean getIsTieResolved() {
        return isTieResolved;
    }

    public void setIsTieResolved(Boolean isTieResolved) {
        this.isTieResolved = isTieResolved;
    }

    public String getTieWinner() {
        return tieWinner;
    }

    public void setTieWinner(String tieWinner) {
        this.tieWinner = tieWinner;
    }

    @Override
    public String toString() {
        return "Session{" +
                "id='" + id + '\'' +
                ", type='" + getType() + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", isPending=" + isPending +
                ", finishedAt='" + finishedAt + '\'' +
                ", editedAt='" + editedAt + '\'' +
                ", participants=" + participants +
                ", pointCategories=" + pointCategories +
                ", resultEntries=" + resultEntries +
                ", isTieResolved=" + isTieResolved +
                ", tieWinner='" + tieWinner + '\'' +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

