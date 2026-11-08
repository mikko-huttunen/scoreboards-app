package com.mikko_huttunen.scoreboards.models;

import com.mikko_huttunen.scoreboards.enums.StatType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ScoreboardSettings {
    @NotNull(message = "Stat types cannot be null")
    @NotEmpty(message = "At least one stat type is required")
    private List<StatType> statTypes;

    @NotNull(message = "Default stat type cannot be null")
    private StatType defaultStatType;

    public List<StatType> getStatTypes() {
        return statTypes;
    }

    public void setStatTypes(List<StatType> statTypes) {
        this.statTypes = statTypes;
    }

    public StatType getDefaultStatType() {
        return defaultStatType;
    }

    public void setDefaultStatType(StatType defaultStatType) {
        this.defaultStatType = defaultStatType;
    }
}
