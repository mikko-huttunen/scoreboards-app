package com.mikko_huttunen.scoreboards.dtos;

import com.mikko_huttunen.scoreboards.models.Auditable;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.ResultEntry;

import java.util.List;
import java.util.Set;

public class SessionDTO extends Auditable {

    private String id;
    private String scoreboardId;
    private String name;
    private String comment;
    private String createdByName;
    private Boolean isPending;
    private Set<String> participants;

    private List<PointCategory> pointCategoryDetails;
    private List<ResultEntry> resultEntryDetails;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getScoreboardId() { return scoreboardId; }
    public void setScoreboardId(String scoreboardId) { this.scoreboardId = scoreboardId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public Boolean getIsPending() { return isPending; }
    public void setIsPending(Boolean isPending) { this.isPending = isPending; }

    public Set<String> getParticipants() { return participants; }
    public void setParticipants(Set<String> participants) { this.participants = participants; }

    public List<PointCategory> getPointCategoryDetails() { return pointCategoryDetails; }
    public void setPointCategoryDetails(List<PointCategory> pointCategoryDetails) {
        this.pointCategoryDetails = pointCategoryDetails;
    }

    public List<ResultEntry> getResultEntryDetails() { return resultEntryDetails; }
    public void setResultEntryDetails(List<ResultEntry> resultEntryDetails) {
        this.resultEntryDetails = resultEntryDetails;
    }
}