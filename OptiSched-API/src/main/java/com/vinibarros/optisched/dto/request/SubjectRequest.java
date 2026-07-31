package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SubjectRequest(
    @NotBlank @Size(max = 50) String code,
    @NotBlank @Size(max = 255) String name,
    @NotNull @Positive Integer workload,
    RoomType requiredRoomType
)
{}
