package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("Comment")
public class Comment extends Auditable {

    @Id
    private String id;

    @Field("scoreboardId")
    @NotBlank(message = "Scoreboard ID cannot be blank")
    @Indexed
    private String scoreboardId;

    @Field("userId")
    @Indexed
    private String userId;

    @Field("username")
    private String username;

    @Field("avatar")
    private String avatar;

    @Field("sessionId")
    @Indexed
    private String sessionId;

    @Field("comment")
    @NotBlank(message = "Comment cannot be blank")
    @Size(max = 100, message = "Comment cannot exceed 100 characters")
    private String comment;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getScoreboardId() {
        return scoreboardId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public void setScoreboardId(String scoreboardId) {
        this.scoreboardId = scoreboardId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
