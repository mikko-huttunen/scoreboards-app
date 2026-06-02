package com.mikko_huttunen.scoreboards.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * User entity representing a user document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("User")
public class User extends Auditable {

    @Id
    private String id;

    @Field("auth0Id")
    @JsonIgnore
    @NotBlank(message = "Auth0 ID cannot be blank")
    private String auth0Id;

    @Field("name")
    @NotBlank(message = "Name cannot be blank")
    private String name;
    
    @Field("email")
    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email must be a valid email address")
    private String email;
    
    @Field("avatar")
    private String avatar;
    
    @Field("scoreboards")
    @NotNull(message = "Scoreboards cannot be null")
    private Set<String> scoreboards = new HashSet<>();

    public String getId() {
        return id;
    }

    public String getAuth0Id() { return auth0Id; }

    public void setAuth0Id(String auth0Id) { this.auth0Id = auth0Id; }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public Set<String> getScoreboards() {
        return scoreboards;
    }

    public void setScoreboards(Set<String> scoreboards) {
        this.scoreboards = scoreboards;
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", avatar='" + avatar + '\'' +
                ", scoreboards=" + scoreboards +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

