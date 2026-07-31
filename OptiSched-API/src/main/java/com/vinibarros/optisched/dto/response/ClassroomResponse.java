package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.RoomType;

public record ClassroomResponse(
        Long id,
        String number,
        Integer capacity,
        RoomType type
)
{}
