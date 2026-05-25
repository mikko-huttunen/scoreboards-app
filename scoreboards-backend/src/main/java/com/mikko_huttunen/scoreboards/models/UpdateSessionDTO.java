package com.mikko_huttunen.scoreboards.models;

import java.util.List;

/**
 * DTO for updating an existing session.
 */
public class UpdateSessionDTO {
    
    private List<String> participants;
    
    private List<String> pointCategories;

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public List<String> getPointCategories() {
        return pointCategories;
    }

    public void setPointCategories(List<String> pointCategories) {
        this.pointCategories = pointCategories;
    }
}

