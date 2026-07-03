package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.Permission;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Set;

/**
 * Membership entity representing a scoreboard-user relationship document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Membership")
public class Membership extends Auditable {

    @Id
    private String id;

    @Field("scoreboardId")
    @JsonIgnore
    @NotNull(message = "Scoreboard ID cannot be null")
    private String scoreboardId;

    @Field("userId")
    @NotNull(message = "User ID cannot be null")
    private String userId;

    @NotNull(message = "Permissions cannot be null")
    private Set<Permission> permissions;

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getScoreboardId() { return scoreboardId; }

    public void setScoreboardId(String scoreboardId) { this.scoreboardId = scoreboardId; }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    @Override
    public String toString() {
        return "ScoreboardMember{" +
                "id='" + id + '\'' +
                ", type='" + getType() + '\'' +
                ", userId='" + userId + '\'' +
                ", permissions=" + permissions +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}
