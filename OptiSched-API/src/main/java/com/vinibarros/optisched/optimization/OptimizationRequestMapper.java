package com.vinibarros.optisched.optimization;


import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.entity.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OptimizationRequestMapper {

    public ProfessorInput toProfessorInput(Professor professor) {
        List<Long> qualifiedSubjectIds = professor.getQualifications()
                .stream()
                .map(q -> q.getSubject().getId())
                .toList();

        List<Long> availableTimeSlotIds = professor.getAvailabilities()
                .stream()
                .map(a -> a.getTimeSlot().getId())
                .toList();

        return new ProfessorInput(professor.getId(), qualifiedSubjectIds, availableTimeSlotIds);
    }

    public SubjectOfferingInput toSubjectOfferingInput(SubjectOffering offering) {
        return new SubjectOfferingInput(
                offering.getId(),
                offering.getSubject().getId(),
                offering.getCourse().getId(),
                offering.getSubject().getWorkload(),
                offering.getExpectedStudents(),
                offering.getRecommendedSemester()
        );
    }

    public ClassroomInput toClassroomInput(Classroom classroom) {
        return new ClassroomInput(classroom.getId(), classroom.getCapacity());
    }

    public TimeSlotInput toTimeSlotInput(TimeSlot timeSlot) {
        return new TimeSlotInput(
                timeSlot.getId(),
                timeSlot.getDayOfWeek().name(),
                timeSlot.getStartTime(),
                timeSlot.getEndTime()
        );
    }

    public OptimizationRequest buildRequest(
            List<Professor> professors,
            List<SubjectOffering> offerings,
            List<Classroom> classrooms,
            List<TimeSlot> timeSlots,
            ObjectiveWeightsInput weights
    ) {
        return new OptimizationRequest(
                professors.stream().map(this::toProfessorInput).toList(),
                offerings.stream().map(this::toSubjectOfferingInput).toList(),
                classrooms.stream().map(this::toClassroomInput).toList(),
                timeSlots.stream().map(this::toTimeSlotInput).toList(),
                weights
        );
    }
}
