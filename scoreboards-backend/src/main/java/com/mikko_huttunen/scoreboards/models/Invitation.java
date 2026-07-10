package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.Permission;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date;
import java.util.Set;

/**
 * Invitation entity representing an invitation document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Invitation")
public class Invitation extends Auditable {
    
    @Id
    private String id;
    
    @Field("receiverId")
    @NotNull(message = "Receiver ID cannot be null")
    @Indexed
    private String receiverId;

    private String receiverName;

    private String inviterName;
    
    @Field("scoreboardId")
    @NotNull(message = "Scoreboard ID cannot be null")
    @Indexed
    private String scoreboardId;

    private String scoreboardName;

    @Field("permissions")
    private Set<Permission> permissions;
    
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

    public String getInviterName() {
        return inviterName;
    }

    public void setInviterName(String inviterName) {
        this.inviterName = inviterName;
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

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<Permission> permissions) {
        this.permissions = permissions;
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
                ", type='" + getType() + '\'' +
                ", receiverId='" + receiverId + '\'' +
                ", receiverName='" + receiverName + '\'' +
                ", inviterName='" + inviterName + '\'' +
                ", scoreboardId='" + scoreboardId + '\'' +
                ", scoreboardName='" + scoreboardName + '\'' +
                ", permissions=" + permissions +
                ", acceptedDate=" + acceptedDate +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

