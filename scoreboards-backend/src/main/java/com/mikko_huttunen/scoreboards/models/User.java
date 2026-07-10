package com.mikko_huttunen.scoreboards.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.HashSet;
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
    @NotNull(message = "Auth0 ID cannot be null")
    @Indexed
    private String auth0Id;

    @Field("name")
    @NotNull(message = "Name cannot be null")
    private String name;
    
    @Field("email")
    @JsonIgnore
    @NotNull(message = "Email cannot be null")
    @Email(message = "Email must be a valid email address")
    private String email;
    
    @Field("avatar")
    private String avatar;

    @JsonIgnore
    private Set<Membership> memberships = new HashSet<>();

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

    public Set<Membership> getMemberships() { return memberships; }

    public void setMemberships(Set<Membership> memberships) { this.memberships = memberships; }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", type='" + getType() + '\'' +
                ", name='" + name + '\'' +
                ", avatar='" + avatar + '\'' +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}

