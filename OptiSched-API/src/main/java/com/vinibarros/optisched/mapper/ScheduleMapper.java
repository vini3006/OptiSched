package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
import org.springframework.stereotype.Component;

@Component
public class ScheduleMapper {

    public Schedule toEntity(Semester semester, Institution institution){
        return toEntity(semester, institution, null);
    }

    public Schedule toEntity(Semester semester, Institution institution, Course course){
        Schedule schedule = new Schedule();
        schedule.setSemester(semester);
        schedule.setInstitution(institution);
        schedule.setCourse(course);
        return schedule;
    }

    public ScheduleResponse toResponse(Schedule schedule){
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getSemester().getId(),
                schedule.getGeneratedAt(),
                schedule.getStatus(),
                schedule.getVersion(),
                schedule.getCourse() != null ? schedule.getCourse().getId() : null
        );
    }
}
