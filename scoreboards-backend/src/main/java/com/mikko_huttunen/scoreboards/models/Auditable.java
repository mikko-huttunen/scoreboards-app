package com.mikko_huttunen.scoreboards.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.util.Date;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Base class for auditable entities in MongoDB.
 * Provides common fields for tracking creation, modification, and soft deletion.
 */
public abstract class Auditable implements Serializable {
    @Field("type")
    private String type;

    @CreatedDate
    @Field("created")
    private Date created;
    
    @LastModifiedDate
    @Field("lastModified")
    private Date lastModified;
    
    @Field("createdBy")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @Indexed
    private String createdBy;

    @Indexed
    @Field("isActive")
    @NotNull(message = "IsActive cannot be null")
    private Boolean isActive = true;

    public String getType() { return type; }

    public void setType(String type) { this.type = type; }

    public Date getCreated() {
        return created;
    }

    public void setCreated(Date created) {
        this.created = created;
    }

    public Date getLastModified() {
        return lastModified;
    }

    public void setLastModified(Date lastModified) {
        this.lastModified = lastModified;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}
