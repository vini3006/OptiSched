package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.TimeSlotRequest;
import com.vinibarros.optisched.dto.response.TimeSlotResponse;
import com.vinibarros.optisched.entity.TimeSlot;
import org.springframework.stereotype.Component;

@Component
public class TimeSlotMapper {

    public TimeSlot toEntity(TimeSlotRequest request){
        TimeSlot timeSlot = new TimeSlot();

        timeSlot.setDayOfWeek(request.dayOfWeek());
        timeSlot.setStartTime(request.startTime());
        timeSlot.setEndTime(request.endTime());
        return timeSlot;
    }

    public TimeSlotResponse toResponse(TimeSlot timeSlot){
        return new TimeSlotResponse(
                timeSlot.getId(),
                timeSlot.getDayOfWeek(),
                timeSlot.getStartTime(),
                timeSlot.getEndTime()
        );
    }
}
