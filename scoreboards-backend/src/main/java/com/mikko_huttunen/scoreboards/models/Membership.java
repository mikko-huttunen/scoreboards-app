package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.Permission;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

/**
 * ScoreboardMember entity representing a scoreboard member in the Scoreboard entity.
 */
public class Membership {
    @NotNull(message = "User ID cannot be null")
    private String userId;

    @NotNull(message = "Permissions cannot be null")
    private Set<Permission> permissions;

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
                ", userId='" + userId + '\'' +
                ", permissions=" + permissions +
                '}';
    }
}
