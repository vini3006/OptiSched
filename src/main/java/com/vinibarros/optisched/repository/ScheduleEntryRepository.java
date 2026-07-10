package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.ScheduleEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;

@Repository
public interface ScheduleEntryRepository extends JpaRepository<ScheduleEntry, Long> {
    List<ScheduleEntry> findByScheduleId(Long scheduleId);
    List<ScheduleEntry> findByScheduleIdAndProfessorId(Long scheduleId, Long professorId);
    List<ScheduleEntry> findByScheduleIdAndClassroomId(Long scheduleId, Long classroomId);
    List<ScheduleEntry> findByScheduleIdAndTimeSlotDayOfWeek(Long scheduleId, DayOfWeek dayOfWeek);
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
}
