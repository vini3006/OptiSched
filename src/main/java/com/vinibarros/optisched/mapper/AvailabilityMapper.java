package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.AvailabilityResponse;
import com.vinibarros.optisched.entity.Availability;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.TimeSlot;
import org.springframework.stereotype.Component;

@Component
public class AvailabilityMapper {

    public Availability toEntity(Professor professor, TimeSlot timeSlot){
        Availability availability = new Availability();
        availability.setProfessor(professor);
        availability.setTimeSlot(timeSlot);
        return availability;
    }

    public AvailabilityResponse toResponse(Availability availability){
        return new AvailabilityResponse(
                availability.getProfessor().getId(),
                availability.getProfessor().getName(),
                availability.getTimeSlot().getId(),
                availability.getTimeSlot().getDayOfWeek(),
                availability.getTimeSlot().getStartTime(),
                availability.getTimeSlot().getEndTime()
        );
    }
}
