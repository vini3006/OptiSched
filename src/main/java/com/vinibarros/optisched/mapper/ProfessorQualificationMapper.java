package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ProfessorQualificationResponse;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.ProfessorQualification;
import com.vinibarros.optisched.entity.Subject;
import org.springframework.stereotype.Component;

@Component
public class ProfessorQualificationMapper {

    public ProfessorQualification toEntity(Professor professor, Subject subject){
        ProfessorQualification professorQualification = new ProfessorQualification();
        professorQualification.setProfessor(professor);
        professorQualification.setSubject(subject);
        return professorQualification;
    }

    public ProfessorQualificationResponse toResponse(ProfessorQualification professorQualification){
        return new ProfessorQualificationResponse(
                professorQualification.getProfessor().getId(),
                professorQualification.getProfessor().getName(),
                professorQualification.getSubject().getId(),
                professorQualification.getSubject().getCode(),
                professorQualification.getSubject().getName()
        );
    }
}
