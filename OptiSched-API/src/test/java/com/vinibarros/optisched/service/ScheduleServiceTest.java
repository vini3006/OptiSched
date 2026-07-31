package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ScheduleComparisonResponse;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Classroom;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.ScheduleEntry;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.entity.SubjectOffering;
import com.vinibarros.optisched.entity.TimeSlot;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleEntryMapper;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ScheduleEntryRepository;
import com.vinibarros.optisched.repository.ScheduleRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private InstitutionRepository institutionRepository;

    @Mock
    private ScheduleEntryRepository scheduleEntryRepository;

    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        scheduleService = new ScheduleService(
                scheduleRepository, semesterRepository, institutionRepository, new ScheduleMapper(),
                scheduleEntryRepository, new ScheduleEntryMapper()
        );
    }

    private Semester semester(Long id) {
        Semester semester = new Semester();
        semester.setId(id);
        return semester;
    }

    private Schedule schedule(Long id, Long semesterId, ScheduleStatus status) {
        Schedule schedule = new Schedule();
        schedule.setId(id);
        schedule.setSemester(semester(semesterId));
        schedule.setStatus(status);
        schedule.setGeneratedAt(LocalDateTime.now());
        schedule.setVersion(1);
        return schedule;
    }

    private SubjectOffering offering(Long id, String subjectName, String courseName) {
        Subject subject = new Subject();
        subject.setId(100L);
        subject.setName(subjectName);

        Course course = new Course();
        course.setId(200L);
        course.setName(courseName);

        SubjectOffering offering = new SubjectOffering();
        offering.setId(id);
        offering.setSubject(subject);
        offering.setCourse(course);
        offering.setSection("A");
        return offering;
    }

    private Professor professor(Long id) {
        Professor professor = new Professor();
        professor.setId(id);
        professor.setName("Professor " + id);
        return professor;
    }

    private Classroom classroom(Long id) {
        Classroom classroom = new Classroom();
        classroom.setId(id);
        classroom.setNumber("Sala " + id);
        return classroom;
    }

    private TimeSlot timeSlot(Long id) {
        TimeSlot timeSlot = new TimeSlot();
        timeSlot.setId(id);
        timeSlot.setDayOfWeek(DayOfWeek.MONDAY);
        timeSlot.setStartTime(LocalTime.of(8, 0));
        timeSlot.setEndTime(LocalTime.of(9, 0));
        return timeSlot;
    }

    private static long nextEntryId = 1L;

    private ScheduleEntry entry(Schedule schedule, SubjectOffering offering, Long professorId, Long classroomId, Long timeSlotId) {
        ScheduleEntry entry = new ScheduleEntry();
        entry.setId(nextEntryId++);
        entry.setSchedule(schedule);
        entry.setSubjectOffering(offering);
        entry.setProfessor(professor(professorId));
        entry.setClassroom(classroom(classroomId));
        entry.setTimeSlot(timeSlot(timeSlotId));
        return entry;
    }

    // -------------------- alterStatus --------------------

    @Test
    void alterStatus_deactivatesAnActiveSchedule() {
        Schedule active = schedule(1L, 7L, ScheduleStatus.ACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(active));
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleResponse response = scheduleService.alterStatus(1L, INSTITUTION_ID);

        assertThat(response.status()).isEqualTo(ScheduleStatus.INACTIVE);
        verify(scheduleRepository, never()).findBySemesterIdAndStatusAndInstitutionId(any(), any(), any());
    }

    @Test
    void alterStatus_activatingDeactivatesThePreviousActiveScheduleForTheSameSemester() {
        Schedule toActivate = schedule(2L, 7L, ScheduleStatus.INACTIVE);
        Schedule currentlyActive = schedule(3L, 7L, ScheduleStatus.ACTIVE);

        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(toActivate));
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(7L, ScheduleStatus.ACTIVE, INSTITUTION_ID))
                .thenReturn(currentlyActive);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleResponse response = scheduleService.alterStatus(2L, INSTITUTION_ID);

        assertThat(response.status()).isEqualTo(ScheduleStatus.ACTIVE);
        assertThat(currentlyActive.getStatus()).isEqualTo(ScheduleStatus.INACTIVE);
    }

    @Test
    void alterStatus_activatingWithNoPreviousActiveScheduleJustActivates() {
        Schedule toActivate = schedule(2L, 7L, ScheduleStatus.INACTIVE);

        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(toActivate));
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(7L, ScheduleStatus.ACTIVE, INSTITUTION_ID))
                .thenReturn(null);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleResponse response = scheduleService.alterStatus(2L, INSTITUTION_ID);

        assertThat(response.status()).isEqualTo(ScheduleStatus.ACTIVE);
    }

    @Test
    void alterStatus_unknownScheduleThrowsResourceNotFound() {
        when(scheduleRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleService.alterStatus(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // -------------------- delete --------------------

    @Test
    void delete_removesTheSchedule() {
        Schedule schedule = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(schedule));

        scheduleService.delete(1L, INSTITUTION_ID);

        verify(scheduleRepository, times(1)).delete(schedule);
    }

    @Test
    void delete_wrapsDataIntegrityViolationAsResourceInUse() {
        Schedule schedule = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(schedule));
        doThrow(new DataIntegrityViolationException("fk violation")).when(scheduleRepository).delete(schedule);

        assertThatThrownBy(() -> scheduleService.delete(1L, INSTITUTION_ID))
                .isInstanceOf(ResourceInUseException.class);
    }

    @Test
    void delete_unknownScheduleThrowsResourceNotFound() {
        when(scheduleRepository.findByIdAndInstitutionId(eq(99L), eq(INSTITUTION_ID))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleService.delete(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(scheduleRepository, never()).delete(any());
    }

    // -------------------- findAll --------------------

    @Test
    void findAll_withoutSemesterId_listsEverySchedule() {
        when(scheduleRepository.findAllByInstitutionId(INSTITUTION_ID))
                .thenReturn(List.of(schedule(1L, 7L, ScheduleStatus.ACTIVE)));

        List<ScheduleResponse> responses = scheduleService.findAll(INSTITUTION_ID, null);

        assertThat(responses).hasSize(1);
        verify(scheduleRepository, never()).findAllByInstitutionIdAndSemesterId(any(), any());
    }

    @Test
    void findAll_withSemesterId_filtersBySemester() {
        when(scheduleRepository.findAllByInstitutionIdAndSemesterId(INSTITUTION_ID, 7L))
                .thenReturn(List.of(schedule(1L, 7L, ScheduleStatus.ACTIVE)));

        List<ScheduleResponse> responses = scheduleService.findAll(INSTITUTION_ID, 7L);

        assertThat(responses).hasSize(1);
        verify(scheduleRepository, never()).findAllByInstitutionId(any());
    }

    // -------------------- compare --------------------

    @Test
    void compare_differentSemestersThrowsInvalidSchedule() {
        Schedule a = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        Schedule b = schedule(2L, 8L, ScheduleStatus.ACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(a));
        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(b));

        assertThatThrownBy(() -> scheduleService.compare(1L, 2L, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleException.class);
    }

    @Test
    void compare_detectsUnchangedMovedAndOfferingsOnlyOnOneSide() {
        Schedule a = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        Schedule b = schedule(2L, 7L, ScheduleStatus.ACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(a));
        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(b));

        SubjectOffering unchangedOffering = offering(500L, "Cálculo I", "Engenharia");
        SubjectOffering movedOffering = offering(501L, "GA", "Engenharia");
        SubjectOffering removedOffering = offering(502L, "Física I", "Engenharia");
        SubjectOffering addedOffering = offering(503L, "Química I", "Engenharia");

        ScheduleEntry unchangedBefore = entry(a, unchangedOffering, 10L, 20L, 30L);
        ScheduleEntry movedBefore = entry(a, movedOffering, 10L, 20L, 30L);
        ScheduleEntry removedEntry = entry(a, removedOffering, 10L, 20L, 30L);

        ScheduleEntry unchangedAfter = entry(b, unchangedOffering, 10L, 20L, 30L);
        ScheduleEntry movedAfter = entry(b, movedOffering, 11L, 20L, 30L);
        ScheduleEntry addedEntry = entry(b, addedOffering, 10L, 20L, 30L);

        when(scheduleEntryRepository.findByScheduleId(1L)).thenReturn(List.of(unchangedBefore, movedBefore, removedEntry));
        when(scheduleEntryRepository.findByScheduleId(2L)).thenReturn(List.of(unchangedAfter, movedAfter, addedEntry));

        ScheduleComparisonResponse response = scheduleService.compare(1L, 2L, INSTITUTION_ID);

        assertThat(response.changed()).hasSize(1);
        assertThat(response.changed().getFirst().subjectOfferingId()).isEqualTo(501L);
        assertThat(response.onlyInA()).hasSize(1);
        assertThat(response.onlyInA().getFirst().subjectOfferingId()).isEqualTo(502L);
        assertThat(response.onlyInB()).hasSize(1);
        assertThat(response.onlyInB().getFirst().subjectOfferingId()).isEqualTo(503L);
    }

    @Test
    void compare_offeringWithMultipleWeeklyEntriesDoesNotBlowUpAndDetectsChange() {
        Schedule a = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        Schedule b = schedule(2L, 7L, ScheduleStatus.ACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(a));
        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(b));

        // Uma oferta com 2 aulas por semana (ex.: segunda e quinta) — o mesmo
        // subjectOfferingId aparece em duas ScheduleEntry distintas na mesma
        // grade, o que já derrubou um Collectors.toMap ingênuo antes.
        SubjectOffering offering = offering(600L, "Programação Linear", "Engenharia");

        ScheduleEntry mondayBefore = entry(a, offering, 40L, 19L, 34L);
        ScheduleEntry thursdayBefore = entry(a, offering, 40L, 19L, 70L);

        ScheduleEntry mondayAfter = entry(b, offering, 40L, 19L, 34L);
        ScheduleEntry thursdayAfter = entry(b, offering, 40L, 25L, 70L);

        when(scheduleEntryRepository.findByScheduleId(1L)).thenReturn(List.of(mondayBefore, thursdayBefore));
        when(scheduleEntryRepository.findByScheduleId(2L)).thenReturn(List.of(mondayAfter, thursdayAfter));

        ScheduleComparisonResponse response = scheduleService.compare(1L, 2L, INSTITUTION_ID);

        assertThat(response.changed()).hasSize(1);
        assertThat(response.changed().getFirst().subjectOfferingId()).isEqualTo(600L);
        assertThat(response.changed().getFirst().before()).hasSize(2);
        assertThat(response.changed().getFirst().after()).hasSize(2);
    }

    @Test
    void compare_offeringWithMultipleWeeklyEntriesUnchangedIsNotReported() {
        Schedule a = schedule(1L, 7L, ScheduleStatus.INACTIVE);
        Schedule b = schedule(2L, 7L, ScheduleStatus.ACTIVE);
        when(scheduleRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(a));
        when(scheduleRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(b));

        SubjectOffering offering = offering(600L, "Programação Linear", "Engenharia");

        ScheduleEntry mondayBefore = entry(a, offering, 40L, 19L, 34L);
        ScheduleEntry thursdayBefore = entry(a, offering, 40L, 19L, 70L);

        // Mesmo conjunto de (professor, sala, horário), só que a ordem de
        // criação das entries é invertida — não deve contar como mudança.
        ScheduleEntry thursdayAfter = entry(b, offering, 40L, 19L, 70L);
        ScheduleEntry mondayAfter = entry(b, offering, 40L, 19L, 34L);

        when(scheduleEntryRepository.findByScheduleId(1L)).thenReturn(List.of(mondayBefore, thursdayBefore));
        when(scheduleEntryRepository.findByScheduleId(2L)).thenReturn(List.of(thursdayAfter, mondayAfter));

        ScheduleComparisonResponse response = scheduleService.compare(1L, 2L, INSTITUTION_ID);

        assertThat(response.changed()).isEmpty();
    }
}
