package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.enums.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);

    Optional<Schedule> findByIdAndInstitutionId(Long id, Long institutionId);

    List<Schedule> findAllByInstitutionId(Long institutionId);

    List<Schedule> findAllByInstitutionIdAndSemesterId(Long institutionId, Long semesterId);

    long countBySemesterIdAndInstitutionId(Long semesterId, Long institutionId);

    boolean existsBySemesterIdAndStatusAndInstitutionId(Long semesterId, ScheduleStatus status, Long institutionId);

    /**
     * courseId/turmaId are nullable and Spring Data JPA correctly translates
     * each into "IS NULL" — pass both null to look up the whole-institution
     * schedule, a real courseId (turmaId null) for that course's own scoped
     * schedule, or a real turmaId (courseId null) for that turma's. A
     * semester can have one ACTIVE schedule per course/turma PLUS one
     * unscoped ACTIVE schedule at the same time, so both columns must be
     * checked together — checking courseId alone can no longer disambiguate
     * "unscoped" from "turma-scoped", since both have course_id NULL.
     */
    Schedule findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(Long semesterId, ScheduleStatus status, Long institutionId, Long courseId, Long turmaId);

    /**
     * All ACTIVE schedules of a semester across every course (plus the
     * course-less one, if any) — used to gather other courses' committed
     * entries as fixed context when generating one course's schedule alone.
     */
    List<Schedule> findAllBySemesterIdAndStatusAndInstitutionId(Long semesterId, ScheduleStatus status, Long institutionId);

    Optional<Schedule> findFirstByInstitutionIdAndStatusOrderByGeneratedAtDesc(Long institutionId, ScheduleStatus status);
}
