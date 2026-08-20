package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.SubjectOfferingRequest;
import com.vinibarros.optisched.dto.response.SubjectOfferingResponse;
import com.vinibarros.optisched.entity.*;
import org.springframework.stereotype.Component;

@Component
public class SubjectOfferingMapper {

    public SubjectOffering toEntity(SubjectOfferingRequest request, Course course, Subject subject, Semester semester, Institution institution){
        SubjectOffering subjectOffering = new SubjectOffering();
        subjectOffering.setCourse(course);
        subjectOffering.setSubject(subject);
        subjectOffering.setSemester(semester);
        subjectOffering.setSection(request.section());
        subjectOffering.setExpectedStudents(request.expectedStudents());
        subjectOffering.setRecommendedSemester(request.recommendedSemester());
        subjectOffering.setInstitution(institution);
        return subjectOffering;
    }

    public SubjectOfferingResponse toResponse(SubjectOffering subjectOffering){
        Course course = subjectOffering.getCourse();
        Turma turma = subjectOffering.getTurma();
        return new SubjectOfferingResponse(
                subjectOffering.getId(),
                course != null ? course.getId() : null,
                subjectOffering.getSubject().getId(),
                subjectOffering.getSemester().getId(),
                subjectOffering.getSection(),
                subjectOffering.getExpectedStudents(),
                subjectOffering.getRecommendedSemester(),
                turma != null ? turma.getId() : null,
                subjectOffering.getWeeklyWorkload()
        );
    }
}
