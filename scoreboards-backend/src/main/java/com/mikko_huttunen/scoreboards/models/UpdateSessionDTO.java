package com.mikko_huttunen.scoreboards.models;

import java.util.List;
import java.util.Set;

/**
 * DTO for updating an existing session.
 */
public class UpdateSessionDTO {

    private Boolean isPending;
    
    private Set<String> participants;
    
    private Set<String> pointCategories;

    private Set<String> resultEntries;

    public Boolean getPending() {
        return isPending;
    }

    public void setPending(Boolean pending) {
        isPending = pending;
    }

    public Set<String> getParticipants() {
        return participants;
    }

    public void setParticipants(Set<String> participants) {
        this.participants = participants;
    }

    public Set<String> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(Set<String> pointCategories) {
        this.pointCategories = pointCategories;
    }

    public Set<String> getResultEntries() {
        return resultEntries;
    }

    public void setResultEntries(Set<String> resultEntries) {
        this.resultEntries = resultEntries;
    }
}

