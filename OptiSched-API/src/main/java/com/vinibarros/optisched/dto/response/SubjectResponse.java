package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.RoomType;

public record SubjectResponse(
        Long id,
        String code,
        String name,
        Integer workload,
        RoomType requiredRoomType
)
{}
