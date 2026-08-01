package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import com.vinibarros.optisched.enums.Term;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises real Flyway migrations + entity mappings against a live Postgres
 * (spring.jpa.hibernate.ddl-auto=validate means Hibernate refuses to start if
 * the entities and the migrations have drifted apart) — the strongest defense
 * against the kind of entity/schema mismatch that a plain mocked unit test
 * cannot catch.
 */
@Transactional
class ScheduleRepositoryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private SemesterRepository semesterRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    private Institution persistInstitution() {
        String unique = String.valueOf(System.nanoTime());
        Institution institution = new Institution();
        institution.setName("Test Institution");
        institution.setSlug("test-institution-" + unique);
        institution.setCnpj(String.format("%014d", System.nanoTime() % 100_000_000_000_000L));
        institution.setSubscriptionStatus(SubscriptionStatus.TRIAL);
        return institutionRepository.save(institution);
    }

    private Semester persistSemester(Institution institution) {
        Semester semester = new Semester();
        semester.setYear(2026);
        semester.setTerm(Term.SECOND);
        semester.setInstitution(institution);
        return semesterRepository.save(semester);
    }

    private Schedule persistSchedule(Semester semester, Institution institution, ScheduleStatus status) {
        Schedule schedule = new Schedule();
        schedule.setSemester(semester);
        schedule.setInstitution(institution);
        schedule.setStatus(status);
        schedule.setGeneratedAt(LocalDateTime.now());
        schedule.setVersion(1);
        return scheduleRepository.save(schedule);
    }

    @Test
    void persistsAndReadsBackAScheduleScopedToItsInstitution() {
        Institution institution = persistInstitution();
        Semester semester = persistSemester(institution);
        Schedule schedule = persistSchedule(semester, institution, ScheduleStatus.ACTIVE);

        Optional<Schedule> found = scheduleRepository.findByIdAndInstitutionId(schedule.getId(), institution.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
        assertThat(found.get().getSemester().getId()).isEqualTo(semester.getId());
    }

    @Test
    void findByIdAndInstitutionId_returnsEmptyForAMismatchedInstitution() {
        Institution institution = persistInstitution();
        Institution otherInstitution = persistInstitution();
        Semester semester = persistSemester(institution);
        Schedule schedule = persistSchedule(semester, institution, ScheduleStatus.ACTIVE);

        Optional<Schedule> found =
                scheduleRepository.findByIdAndInstitutionId(schedule.getId(), otherInstitution.getId());

        assertThat(found).isEmpty();
    }

    @Test
    void findAllByInstitutionId_onlyReturnsSchedulesForThatInstitution() {
        Institution institution = persistInstitution();
        Institution otherInstitution = persistInstitution();
        Semester semester = persistSemester(institution);
        Semester otherSemester = persistSemester(otherInstitution);

        persistSchedule(semester, institution, ScheduleStatus.ACTIVE);
        persistSchedule(otherSemester, otherInstitution, ScheduleStatus.ACTIVE);

        List<Schedule> schedules = scheduleRepository.findAllByInstitutionId(institution.getId());

        assertThat(schedules).hasSize(1);
        assertThat(schedules.get(0).getInstitution().getId()).isEqualTo(institution.getId());
    }
}
