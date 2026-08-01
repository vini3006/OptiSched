package com.vinibarros.optisched.optimization;


import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.PreferredShift;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

@Component
public class OptimizationRequestMapper {

    /**
     * Shared by the per-course hard shift restriction (SubjectOffering.allowedTimeSlotIds,
     * derived from Course.allowedShift) and ScheduleGenerationService's global soft
     * preferredShift — same classification, two different callers.
     */
    public boolean matchesShift(LocalTime startTime, PreferredShift shift) {
        return switch (shift) {
            case MORNING -> startTime.isBefore(LocalTime.NOON);
            case AFTERNOON -> !startTime.isBefore(LocalTime.NOON) && startTime.isBefore(LocalTime.of(18, 0));
            case EVENING -> !startTime.isBefore(LocalTime.of(18, 0));
        };
    }

    public ProfessorInput toProfessorInput(Professor professor) {
        List<Long> qualifiedSubjectIds = professor.getQualifications() != null
                ? professor.getQualifications().stream().map(q -> q.getSubject().getId()).toList()
                : Collections.emptyList();

        List<Long> availableTimeSlotIds = professor.getAvailabilities() != null
                ? professor.getAvailabilities().stream().map(a -> a.getTimeSlot().getId()).toList()
                : Collections.emptyList();

        return new ProfessorInput(
                professor.getId(),
                qualifiedSubjectIds,
                availableTimeSlotIds,
                professor.getMaxDailyTimeSlots(),
                professor.getMaxWeeklyTimeSlots()
        );
    }

    public SubjectOfferingInput toSubjectOfferingInput(SubjectOffering offering, List<TimeSlot> timeSlots) {
        PreferredShift allowedShift = offering.getCourse().getAllowedShift();
        List<Long> allowedTimeSlotIds = allowedShift != null
                ? timeSlots.stream()
                        .filter(t -> matchesShift(t.getStartTime(), allowedShift))
                        .map(TimeSlot::getId)
                        .toList()
                : null;

        return new SubjectOfferingInput(
                offering.getId(),
                offering.getSubject().getId(),
                offering.getCourse().getId(),
                offering.getSubject().getWorkload(),
                offering.getExpectedStudents(),
                offering.getRecommendedSemester(),
                offering.getSubject().getRequiredRoomType(),
                allowedTimeSlotIds,
                offering.getSubject().isSupportsCoTeaching()
        );
    }

    public ClassroomInput toClassroomInput(Classroom classroom) {
        return new ClassroomInput(classroom.getId(), classroom.getCapacity(), classroom.getType());
    }

    public TimeSlotInput toTimeSlotInput(TimeSlot timeSlot) {
        return new TimeSlotInput(
                timeSlot.getId(),
                timeSlot.getDayOfWeek().name(),
                timeSlot.getStartTime(),
                timeSlot.getEndTime()
        );
    }

    public LockedAssignmentInput toLockedAssignmentInput(ScheduleEntry entry) {
        return new LockedAssignmentInput(
                entry.getSubjectOffering().getId(),
                entry.getProfessor().getId(),
                entry.getClassroom().getId(),
                entry.getTimeSlot().getId()
        );
    }

    public OptimizationRequest buildRequest(
            List<Professor> professors,
            List<SubjectOffering> offerings,
            List<Classroom> classrooms,
            List<TimeSlot> timeSlots,
            ObjectiveWeightsInput weights,
            List<Long> preferredTimeSlotIds,
            List<LockedAssignmentInput> lockedAssignments,
            Double solverTimeLimitSeconds
    ) {
        return new OptimizationRequest(
                professors.stream().map(this::toProfessorInput).toList(),
                offerings.stream().map(o -> toSubjectOfferingInput(o, timeSlots)).toList(),
                classrooms.stream().map(this::toClassroomInput).toList(),
                timeSlots.stream().map(this::toTimeSlotInput).toList(),
                weights,
                preferredTimeSlotIds,
                lockedAssignments,
                solverTimeLimitSeconds
        );
    }
}
