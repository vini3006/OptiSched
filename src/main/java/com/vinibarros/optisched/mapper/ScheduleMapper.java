package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
import org.springframework.stereotype.Component;

@Component
public class ScheduleMapper {

    public Schedule toEntity(Semester semester){
        Schedule schedule = new Schedule();
        schedule.setSemester(semester);
        return schedule;
    }

    public ScheduleResponse toResponse(Schedule schedule){
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getSemester().getId(),
                schedule.getGeneratedAt(),
                schedule.getStatus()
        );
    }
}
