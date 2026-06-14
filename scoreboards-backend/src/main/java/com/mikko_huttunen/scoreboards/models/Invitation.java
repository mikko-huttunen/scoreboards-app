package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date;

/**
 * Invitation entity representing an invitation document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Invitation")
public class Invitation extends Auditable {
    
    @Id
    private String id;
    
    @Field("receiverId")
    @NotBlank(message = "Receiver ID cannot be blank")
    private String receiverId;

    @Field("receiverName")
    @NotBlank(message = "Receiver name cannot be blank")
    private String receiverName;

    @Field("createdByName")
    @NotBlank(message = "Created by name cannot be blank")
    private String createdByName;
    
    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;
    
    @Field("scoreboardName")
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String scoreboardName;
    
    @Field("isPending")
    @NotNull(message = "IsPending cannot be null")
    private Boolean isPending = true;
    
    @Field("acceptedDate")
    private Date acceptedDate;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(String receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverName() { return receiverName; }

    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String senderName) {
        this.createdByName = senderName;
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

    public Date getAcceptedDate() {
        return acceptedDate;
    }

    public void setAcceptedDate(Date acceptedDate) {
        this.acceptedDate = acceptedDate;
    }

    @Override
    public String toString() {
        return "Invitation{" +
                "id='" + id + '\'' +
                ", receiverId='" + receiverId + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", scoreboardName='" + scoreboardName + '\'' +
                ", isPending=" + isPending +
                ", acceptedDate=" + acceptedDate +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

