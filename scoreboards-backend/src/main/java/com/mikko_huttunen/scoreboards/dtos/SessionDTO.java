package com.mikko_huttunen.scoreboards.dtos;

import com.mikko_huttunen.scoreboards.models.Auditable;
import com.mikko_huttunen.scoreboards.models.Comment;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.ResultEntry;

import java.util.Date;
import java.util.List;
import java.util.Set;

/**
 * DTO for session data.
 */
public class SessionDTO extends Auditable {

    private String id;
    private String scoreboardId;
    private String name;
    private String description;
    private String createdByName;
    private Boolean isPending;
    private Date finishedAt;
    private Date editedAt;
    private Set<String> participants;
    private Boolean isTieResolved;
    private String tieWinner;

    private List<PointCategory> pointCategoryDetails;
    private List<ResultEntry> resultEntryDetails;
    private List<Comment> comments;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getScoreboardId() { return scoreboardId; }
    public void setScoreboardId(String scoreboardId) { this.scoreboardId = scoreboardId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public Boolean getIsPending() { return isPending; }
    public void setIsPending(Boolean isPending) { this.isPending = isPending; }

    public Date getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Date finishedAt) { this.finishedAt = finishedAt; }

    public Date getEditedAt() { return editedAt; }
    public void setEditedAt(Date editedAt) { this.editedAt = editedAt; }

    public Set<String> getParticipants() { return participants; }
    public void setParticipants(Set<String> participants) { this.participants = participants; }

    public Boolean getIsTieResolved() { return isTieResolved; }
    public void setIsTieResolved(Boolean isTieResolved) { this.isTieResolved = isTieResolved; }

    public String getTieWinner() { return tieWinner; }
    public void setTieWinner(String tieWinner) { this.tieWinner = tieWinner; }

    public List<PointCategory> getPointCategoryDetails() { return pointCategoryDetails; }
    public void setPointCategoryDetails(List<PointCategory> pointCategoryDetails) {
        this.pointCategoryDetails = pointCategoryDetails;
    }

    public List<ResultEntry> getResultEntryDetails() { return resultEntryDetails; }
    public void setResultEntryDetails(List<ResultEntry> resultEntryDetails) {
        this.resultEntryDetails = resultEntryDetails;
    }

    public List<Comment> getComments() { return comments; }
    public void setComments(List<Comment> comments) {
        this.comments = comments;
    }
}