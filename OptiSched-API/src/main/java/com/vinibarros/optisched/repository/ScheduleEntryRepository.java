package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.ScheduleEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleEntryRepository extends JpaRepository<ScheduleEntry, Long> {
    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    Optional<ScheduleEntry> findByIdAndInstitutionId(Long id, Long institutionId);

    boolean existsByProfessorId(Long professorId);

    boolean existsBySubjectOfferingId(Long subjectOfferingId);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleId(Long scheduleId);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleIdAndLockedTrue(Long scheduleId);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleIdAndProfessorId(Long scheduleId, Long professorId);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleIdAndClassroomId(Long scheduleId, Long classroomId);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleIdAndTimeSlotDayOfWeek(Long scheduleId, DayOfWeek dayOfWeek);

    @EntityGraph(attributePaths = {"schedule", "professor", "subjectOffering.subject", "subjectOffering.course", "classroom", "timeSlot"})
    List<ScheduleEntry> findByScheduleIdAndTimeSlotId(Long scheduleId, Long timeSlotId);

    boolean existsByScheduleIdAndClassroomIdAndTimeSlotId(
            Long scheduleId,
            Long classroomId,
            Long timeSlotId
    );

    boolean existsByScheduleIdAndProfessorIdAndTimeSlotId(
            Long scheduleId,
            Long professorId,
            Long timeSlotId
    );

    boolean existsByScheduleIdAndProfessorIdAndSubjectOfferingIdAndClassroomIdAndTimeSlotId(
            Long scheduleId,
            Long professorId,
            Long subjectOfferingId,
            Long classroomId,
            Long timeSlotId
    );

    boolean existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(
            Long scheduleId,
            Long classroomId,
            Long timeSlotId,
            Long id
    );

    boolean existsByScheduleIdAndProfessorIdAndTimeSlotIdAndIdNot(
            Long scheduleId,
            Long professorId,
            Long timeSlotId,
            Long id
    );

    boolean existsByScheduleIdAndProfessorIdAndSubjectOfferingIdAndClassroomIdAndTimeSlotIdAndIdNot(
            Long scheduleId,
            Long professorId,
            Long subjectOfferingId,
            Long classroomId,
            Long timeSlotId,
            Long id
    );
}
