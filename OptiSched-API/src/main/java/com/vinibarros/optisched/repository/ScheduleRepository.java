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
     * courseId is nullable and Spring Data JPA correctly translates it into
     * "course_id IS NULL" — pass null to look up the whole-institution
     * schedule (course-less), or a real id to look up that course's own
     * scoped schedule. Since a semester can now have one ACTIVE schedule per
     * course PLUS one course-less ACTIVE schedule at the same time, the old
     * course-blind lookup would no longer be unambiguous.
     */
    Schedule findBySemesterIdAndStatusAndInstitutionIdAndCourseId(Long semesterId, ScheduleStatus status, Long institutionId, Long courseId);

    /**
     * All ACTIVE schedules of a semester across every course (plus the
     * course-less one, if any) — used to gather other courses' committed
     * entries as fixed context when generating one course's schedule alone.
     */
    List<Schedule> findAllBySemesterIdAndStatusAndInstitutionId(Long semesterId, ScheduleStatus status, Long institutionId);

    Optional<Schedule> findFirstByInstitutionIdAndStatusOrderByGeneratedAtDesc(Long institutionId, ScheduleStatus status);
}
