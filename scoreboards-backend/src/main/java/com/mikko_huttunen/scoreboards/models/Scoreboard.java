package com.mikko_huttunen.scoreboards.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

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

    @NotEmpty(message = "Memberships cannot be blank")
    private List<Membership> memberships = new ArrayList<>();

    @NotEmpty(message = "Point categories cannot be null")
    private List<PointCategory> pointCategories = new ArrayList<>();

    private List<Session> sessions = new ArrayList<>();

    private List<ResultEntry> resultEntries = new ArrayList<>();

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

    public List<Membership> getMemberships() {
        return memberships;
    }

    public void setMemberships(List<Membership> members) {
        this.memberships = members;
    }

    public List<PointCategory> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(List<PointCategory> pointCategories) {
        this.pointCategories = pointCategories;
    }

    public List<Session> getSessions() { return sessions; }

    public void setSessions(List<Session> sessions) { this.sessions = sessions; }

    public List<ResultEntry> getResultEntries() { return resultEntries; }

    public void setResultEntries(List<ResultEntry> resultEntries) { this.resultEntries = resultEntries; }

    @Override
    public String toString() {
        return "Scoreboard{" +
                "id='" + id + '\'' +
                ", type='" + getType() + '\'' +
                ", name='" + name + '\'' +
                ", memberships='" + memberships + '\'' +
                ", pointCategories=" + pointCategories +
                ", sessions=" + sessions +
                ", resultEntries=" + resultEntries +
                ", created=" + getCreated() +
                ", lastModified=" + getLastModified() +
                ", createdBy='" + getCreatedBy() + '\'' +
                ", isActive=" + getIsActive() +
                '}';
    }
}
