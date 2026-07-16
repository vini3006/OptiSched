package com.vinibarros.optisched.dto.optimization;

import java.util.List;

public record OptimizationRequest(
        List<ProfessorInput> professors,
        List<SubjectOfferingInput> subjectOfferings,
        List<ClassroomInput> classrooms,
        List<TimeSlotInput> timeSlots,
        ObjectiveWeightsInput objectiveWeights
)
{}
