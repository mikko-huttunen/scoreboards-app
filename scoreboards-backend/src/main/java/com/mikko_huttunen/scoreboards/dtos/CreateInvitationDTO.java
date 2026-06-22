package com.mikko_huttunen.scoreboards.dtos;

import com.mikko_huttunen.scoreboards.enums.Permission;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

/**
 * DTO for creating a new invitation.
 */
public class CreateInvitationDTO {

    @NotBlank(message = "Receiver email cannot be blank")
    private String receiverEmail;

    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;

    @NotNull(message = "Permissions cannot be null")
    private Set<Permission> permissions;

    public String getReceiverEmail() { return receiverEmail; }
    public void setReceiverEmail(String receiverEmail) { this.receiverEmail = receiverEmail; }

    public String getScoreboardId() { return scoreboardId; }
    public void setScoreboardId(String scoreboardId) { this.scoreboardId = scoreboardId; }

    public Set<Permission> getPermissions() { return permissions; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }
}
