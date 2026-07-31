package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.ProfessorResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Professor;
import org.springframework.stereotype.Component;

@Component
public class ProfessorMapper {

    public Professor toEntity(UserRequest request, Institution institution) {
        Professor professor = new Professor();
        professor.setName(request.name());
        professor.setInstitution(institution);
        return professor;
    }

    public ProfessorResponse toResponse(Professor professor) {
        return new ProfessorResponse(
                professor.getId(),
                professor.getName(),
                professor.getMaxDailyTimeSlots(),
                professor.getMaxWeeklyTimeSlots()
        );
    }
}

