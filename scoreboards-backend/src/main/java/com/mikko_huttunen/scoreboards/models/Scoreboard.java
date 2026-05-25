package com.mikko_huttunen.scoreboards.models;

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
 * Scoreboard entity representing a scoreboard document in MongoDB.
 * Extends Auditable to include creation, modification, and soft deletion tracking.
 */
@Document("Scoreboard")
public class Scoreboard extends Auditable {
    
    @Id
    private String id;
    
    @Field("name")
    @NotBlank(message = "Scoreboard name cannot be blank")
    private String name;

    @Field("users")
    @NotBlank(message = "Users cannot be blank")
    private Set<String> users = new HashSet<>();
    
    @Field("pointCategories")
    @NotNull(message = "Point categories cannot be null")
    private List<String> pointCategories = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Set<String> getUsers() {
        return users;
    }

    public void setUsers(Set<String> users) {
        this.users = users;
    }

    public List<String> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(List<String> pointCategories) {
        this.pointCategories = pointCategories;
    }

    @Override
    public String toString() {
        return "Scoreboard{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", users='" + users + '\'' +
                ", pointCategories=" + pointCategories +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}
