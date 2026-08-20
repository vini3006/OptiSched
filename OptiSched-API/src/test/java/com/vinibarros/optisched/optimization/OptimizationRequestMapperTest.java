package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.SubjectOfferingInput;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.PreferredShift;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OptimizationRequestMapperTest {

    private final OptimizationRequestMapper mapper = new OptimizationRequestMapper();

    private TimeSlot timeSlot(Long id, LocalTime startTime) {
        TimeSlot timeSlot = new TimeSlot();
        timeSlot.setId(id);
        timeSlot.setStartTime(startTime);
        return timeSlot;
    }

    private SubjectOffering offering(PreferredShift allowedShift) {
        Subject subject = new Subject();
        subject.setId(100L);
        subject.setWorkload(2);

        Course course = new Course();
        course.setId(200L);
        course.setAllowedShift(allowedShift);

        SubjectOffering offering = new SubjectOffering();
        offering.setId(500L);
        offering.setSubject(subject);
        offering.setCourse(course);
        offering.setExpectedStudents(30);
        offering.setRecommendedSemester(1);
        return offering;
    }

    @Test
    void courseWithoutAllowedShift_leavesAllowedTimeSlotIdsNull() {
        List<TimeSlot> timeSlots = List.of(timeSlot(1L, LocalTime.of(8, 0)), timeSlot(2L, LocalTime.of(19, 0)));

        SubjectOfferingInput input = mapper.toSubjectOfferingInput(offering(null), timeSlots);

        assertThat(input.allowedTimeSlotIds()).isNull();
    }

    @Test
    void courseWithMorningShift_onlyIncludesMorningTimeSlotIds() {
        List<TimeSlot> timeSlots = List.of(
                timeSlot(1L, LocalTime.of(8, 0)),   // morning
                timeSlot(2L, LocalTime.of(14, 0)),  // afternoon
                timeSlot(3L, LocalTime.of(19, 0))   // evening
        );

        SubjectOfferingInput input = mapper.toSubjectOfferingInput(offering(PreferredShift.MORNING), timeSlots);

        assertThat(input.allowedTimeSlotIds()).containsExactly(1L);
    }

    @Test
    void subjectWithoutCoTeaching_reportsAllowsMultipleProfessorsAsFalse() {
        SubjectOffering offering = offering(null);
        offering.getSubject().setSupportsCoTeaching(false);

        SubjectOfferingInput input = mapper.toSubjectOfferingInput(offering, List.of());

        assertThat(input.allowsMultipleProfessors()).isFalse();
    }

    @Test
    void subjectWithCoTeaching_reportsAllowsMultipleProfessorsAsTrue() {
        SubjectOffering offering = offering(null);
        offering.getSubject().setSupportsCoTeaching(true);

        SubjectOfferingInput input = mapper.toSubjectOfferingInput(offering, List.of());

        assertThat(input.allowsMultipleProfessors()).isTrue();
    }

    @Test
    void turmaOffering_withNoCourse_doesNotThrowAndReportsTurmaId() {
        Subject subject = new Subject();
        subject.setId(100L);
        subject.setWorkload(2);

        Turma turma = new Turma();
        turma.setId(300L);

        SubjectOffering offering = new SubjectOffering();
        offering.setId(500L);
        offering.setSubject(subject);
        offering.setCourse(null);
        offering.setTurma(turma);
        offering.setExpectedStudents(30);

        SubjectOfferingInput input = mapper.toSubjectOfferingInput(offering, List.of());

        assertThat(input.courseId()).isNull();
        assertThat(input.turmaId()).isEqualTo(300L);
        assertThat(input.allowedTimeSlotIds()).isNull();
    }
}
