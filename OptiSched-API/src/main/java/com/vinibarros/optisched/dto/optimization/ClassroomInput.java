package com.vinibarros.optisched.dto.optimization;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.vinibarros.optisched.enums.RoomType;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ClassroomInput(
        Long id,
        Integer capacity,
        RoomType type
)
{}
