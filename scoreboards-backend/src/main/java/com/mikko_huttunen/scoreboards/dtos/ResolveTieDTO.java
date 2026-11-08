package com.mikko_huttunen.scoreboards.dtos;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for resolving a session tie breaker.
 */
public class ResolveTieDTO {

    @NotBlank(message = "Tie winner cannot be blank")
    private String tieWinner;

    public String getTieWinner() {
        return tieWinner;
    }

    public void setTieWinner(String tieWinner) {
        this.tieWinner = tieWinner;
    }
}
