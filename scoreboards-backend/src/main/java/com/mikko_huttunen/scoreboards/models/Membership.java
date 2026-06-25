package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.Permission;
import jakarta.validation.constraints.NotNull;
import net.minidev.json.annotate.JsonIgnore;

import java.util.Set;

/**
 * Membership entity representing a scoreboard-member relationship in the Scoreboard entity.
 */
public class Membership {
    @JsonIgnore
    @NotNull(message = "Scoreboard ID cannot be null")
    private String scoreboardId;

    @NotNull(message = "User ID cannot be null")
    private String userId;

    @NotNull(message = "Permissions cannot be null")
    private Set<Permission> permissions;

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
                ", scoreboardId='" + scoreboardId + '\'' +
                ", userId='" + userId + '\'' +
                ", permissions=" + permissions +
                '}';
    }
}
