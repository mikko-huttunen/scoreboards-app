package com.mikko_huttunen.scoreboards.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.annotation.Id;

/**
 * DTO for point category data.
 */
public class PointCategoryDTO {

    @Id
    private String id;

    @NotBlank(message = "Point category name cannot be blank")
    private String name;

    @NotBlank(message = "Color cannot be blank")
    @Pattern(regexp = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", message = "Color must be a valid HEX color code")
    private String color;

    @NotNull(message = "Index cannot be null")
    private Integer index;

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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getIndex() { return index; }

    public void setIndex(Integer index) { this.index = index; }
}