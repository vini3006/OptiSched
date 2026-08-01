package com.vinibarros.optisched.dto.optimization;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record OptimizationRequest(
        List<ProfessorInput> professors,
        List<SubjectOfferingInput> subjectOfferings,
        List<ClassroomInput> classrooms,
        List<TimeSlotInput> timeSlots,
        ObjectiveWeightsInput objectiveWeights,
        List<Long> preferredTimeSlotIds,
        List<LockedAssignmentInput> lockedAssignments,
        Double solverTimeLimitSeconds
)
{}
