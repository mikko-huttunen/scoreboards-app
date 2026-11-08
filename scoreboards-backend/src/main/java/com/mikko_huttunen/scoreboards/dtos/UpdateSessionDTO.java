package com.mikko_huttunen.scoreboards.dtos;

import com.mikko_huttunen.scoreboards.models.Result;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * DTO for updating an existing session.
 */
public class UpdateSessionDTO {

    private String name;

    private String description;

    /**
     * User ID of the tie breaker winner. Null leaves the current winner untouched, an empty
     * string clears it and reopens the tie.
     */
    private String tieWinner;

    @Valid
    @NotNull(message = "Result entries cannot be null")
    private List<ResultEntryUpdateDTO> resultEntries = new ArrayList<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTieWinner() {
        return tieWinner;
    }

    public void setTieWinner(String tieWinner) {
        this.tieWinner = tieWinner;
    }

    public List<ResultEntryUpdateDTO> getResultEntries() {
        return resultEntries;
    }

    public void setResultEntries(List<ResultEntryUpdateDTO> resultEntries) {
        this.resultEntries = resultEntries;
    }

    /**
     * DTO for updating an existing result entry within a session.
     */
    public static class ResultEntryUpdateDTO {

        @NotBlank(message = "Result entry ID cannot be blank")
        private String id;

        @NotBlank(message = "User ID cannot be blank")
        private String userId;

        @Valid
        @NotNull(message = "Results cannot be null")
        private Set<Result> results = new HashSet<>();

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public Set<Result> getResults() {
            return results;
        }

        public void setResults(Set<Result> results) {
            this.results = results;
        }
    }
}