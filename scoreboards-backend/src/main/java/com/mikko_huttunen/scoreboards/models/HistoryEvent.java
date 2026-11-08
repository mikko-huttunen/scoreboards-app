package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.HistoryAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Document("HistoryEvent")
@CompoundIndex(name = "scoreboard_created_idx", def = "{'scoreboardId': 1, 'created': -1}")
public class HistoryEvent extends Auditable {

    @Id
    private String id;

    @Field("scoreboardId")
    @Indexed
    @NotBlank(message = "Scoreboard ID cannot be blank")
    private String scoreboardId;

    @Field("action")
    @NotNull(message = "History action cannot be null")
    private HistoryAction action;

    @Field("entity")
    @NotBlank(message = "History entity cannot be blank")
    private String entity;

    @Field("entityId")
    @NotBlank(message = "Entity ID cannot be blank")
    private String entityId;

    @Field("entityName")
    private String entityName;

    @Field("details")
    private Map<String, Object> details = new LinkedHashMap<>();

    private String createdByName;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getScoreboardId() {
        return scoreboardId;
    }

    public void setScoreboardId(String scoreboardId) {
        this.scoreboardId = scoreboardId;
    }

    public HistoryAction getAction() {
        return action;
    }

    public void setAction(HistoryAction action) {
        this.action = action;
    }

    public String getEntity() {
        return entity;
    }

    public void setEntity(String entity) {
        this.entity = entity;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getEntityName() {
        return entityName;
    }

    public void setEntityName(String entityName) {
        this.entityName = entityName;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }
}