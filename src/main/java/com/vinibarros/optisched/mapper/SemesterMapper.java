package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.SemesterRequest;
import com.vinibarros.optisched.dto.response.SemesterResponse;
import com.vinibarros.optisched.entity.Semester;
import org.springframework.stereotype.Component;

@Component
public class SemesterMapper {

    public Semester toEntity(SemesterRequest request){
        Semester semester = new Semester();
        semester.setYear(request.year());
        semester.setTerm(request.term());
        return semester;
    }

    public SemesterResponse toResponse(Semester semester){
        return new SemesterResponse(
                semester.getId(),
                semester.getYear(),
                semester.getTerm()
        );
    }
}
