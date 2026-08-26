package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.dto.request.ScheduleGenerationRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.*;
import com.vinibarros.optisched.service.TurmaOfferingSyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleGenerationServiceTest {

    private static final Long INSTITUTION_ID = 15L;
    private static final Long SEMESTER_ID = 7L;

    @Mock private ProfessorRepository professorRepository;
    @Mock private SubjectOfferingRepository subjectOfferingRepository;
    @Mock private ClassroomRepository classroomRepository;
    @Mock private TimeSlotRepository timeSlotRepository;
    @Mock private SemesterRepository semesterRepository;
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private ScheduleEntryRepository scheduleEntryRepository;
    @Mock private InstitutionRepository institutionRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private TurmaRepository turmaRepository;
    @Mock private TurmaOfferingSyncService turmaOfferingSyncService;
    @Mock private OptimizationRequestMapper requestMapper;
    @Mock private OptimizerClient optimizerClient;
    @Mock private EmailSender emailSender;
    @Mock private DemoGenerationGuardrail demoGenerationGuardrail;

    private ScheduleGenerationService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleGenerationService(
                professorRepository, subjectOfferingRepository, classroomRepository, timeSlotRepository,
                semesterRepository, scheduleRepository, new ScheduleMapper(), scheduleEntryRepository,
                institutionRepository, courseRepository, turmaRepository, turmaOfferingSyncService, requestMapper, optimizerClient, emailSender,
                demoGenerationGuardrail
        );
    }

    private Semester semester() {
        Semester semester = new Semester();
        semester.setId(SEMESTER_ID);
        return semester;
    }

    private Institution institution() {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        return institution;
    }

    private Institution demoInstitution() {
        Institution institution = institution();
        institution.setDemo(true);
        return institution;
    }

    private SubjectOffering offering() {
        Subject subject = new Subject();
        subject.setId(100L);
        Course course = new Course();
        course.setId(200L);

        SubjectOffering offering = new SubjectOffering();
        offering.setId(500L);
        offering.setSubject(subject);
        offering.setCourse(course);
        offering.setRecommendedSemester(1);
        offering.setExpectedStudents(30);
        return offering;
    }

    private Turma turmaEntity(Long id) {
        Turma turma = new Turma();
        turma.setId(id);
        return turma;
    }

    private SubjectOffering turmaOffering() {
        Subject subject = new Subject();
        subject.setId(150L);

        SubjectOffering offering = new SubjectOffering();
        offering.setId(600L);
        offering.setSubject(subject);
        offering.setTurma(turmaEntity(900L));
        offering.setExpectedStudents(30);
        return offering;
    }

    private Professor professor() {
        Professor professor = new Professor();
        professor.setId(10L);
        return professor;
    }

    private Classroom classroom() {
        Classroom classroom = new Classroom();
        classroom.setId(20L);
        return classroom;
    }

    private TimeSlot timeSlot() {
        TimeSlot timeSlot = new TimeSlot();
        timeSlot.setId(30L);
        timeSlot.setStartTime(LocalTime.of(8, 0));
        return timeSlot;
    }

    private ScheduleGenerationRequest options() {
        return new ScheduleGenerationRequest(5.0, 5.0, 0.0, 5.0, null, null, null, null, null);
    }

    private void stubCommonLookups() {
        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID))
                .thenReturn(Optional.of(semester()));
        when(subjectOfferingRepository.findBySemesterId(SEMESTER_ID)).thenReturn(List.of(offering()));
        when(professorRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(professor()));
        when(classroomRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(classroom()));
        when(timeSlotRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(timeSlot()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));

        when(requestMapper.buildRequest(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mock(OptimizationRequest.class));

        OptimizationResponse response = new OptimizationResponse(List.of(
                new ScheduleEntryOutput(10L, 500L, 20L, 30L)
        ));
        when(optimizerClient.optimize(any())).thenReturn(response);

        when(professorRepository.getReferenceById(10L)).thenReturn(professor());
        when(subjectOfferingRepository.getReferenceById(500L)).thenReturn(offering());
        when(classroomRepository.getReferenceById(20L)).thenReturn(classroom());
        when(timeSlotRepository.getReferenceById(30L)).thenReturn(timeSlot());

        when(scheduleRepository.countBySemesterIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(0L);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void noPreviousActiveSchedule_sendsAnEmptyLockedAssignmentsList() {
        stubCommonLookups();
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID, null, null))
                .thenReturn(null);

        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LockedAssignmentInput>> lockedCaptor = ArgumentCaptor.forClass(List.class);
        verify(requestMapper).buildRequest(any(), any(), any(), any(), any(), any(), lockedCaptor.capture(), any());

        assertThat(lockedCaptor.getValue()).isEmpty();
        verify(scheduleEntryRepository, never()).findByScheduleIdAndLockedTrue(any());
    }

    @Test
    void previousActiveScheduleWithLockedEntries_carriesThemIntoTheRequestAndDeactivatesIt() {
        stubCommonLookups();

        Schedule previousActive = new Schedule();
        previousActive.setId(99L);
        previousActive.setStatus(ScheduleStatus.ACTIVE);

        ScheduleEntry lockedEntry = new ScheduleEntry();
        lockedEntry.setSubjectOffering(offering());
        lockedEntry.setProfessor(professor());
        lockedEntry.setClassroom(classroom());
        lockedEntry.setTimeSlot(timeSlot());
        lockedEntry.setLocked(true);

        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID, null, null))
                .thenReturn(previousActive);
        when(scheduleEntryRepository.findByScheduleIdAndLockedTrue(99L)).thenReturn(List.of(lockedEntry));
        when(requestMapper.toLockedAssignmentInput(lockedEntry))
                .thenReturn(new LockedAssignmentInput(500L, 10L, 20L, 30L));

        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LockedAssignmentInput>> lockedCaptor = ArgumentCaptor.forClass(List.class);
        verify(requestMapper).buildRequest(any(), any(), any(), any(), any(), any(), lockedCaptor.capture(), any());

        assertThat(lockedCaptor.getValue()).containsExactly(new LockedAssignmentInput(500L, 10L, 20L, 30L));
        assertThat(previousActive.getStatus()).isEqualTo(ScheduleStatus.INACTIVE);
    }

    // -------------------- SCHOOL mode (turma) --------------------

    @Test
    void generateSchedule_turmaOnlyOfferings_doesNotThrowInvalidSchedule() {
        SubjectOffering turmaOffering = turmaOffering();

        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(Optional.of(semester()));
        when(subjectOfferingRepository.findBySemesterId(SEMESTER_ID)).thenReturn(List.of(turmaOffering));
        when(professorRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(professor()));
        when(classroomRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(classroom()));
        when(timeSlotRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(timeSlot()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID, null, null))
                .thenReturn(null);

        when(requestMapper.buildRequest(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mock(OptimizationRequest.class));

        OptimizationResponse response = new OptimizationResponse(List.of(
                new ScheduleEntryOutput(10L, 600L, 20L, 30L)
        ));
        when(optimizerClient.optimize(any())).thenReturn(response);

        when(professorRepository.getReferenceById(10L)).thenReturn(professor());
        when(subjectOfferingRepository.getReferenceById(600L)).thenReturn(turmaOffering);
        when(classroomRepository.getReferenceById(20L)).thenReturn(classroom());
        when(timeSlotRepository.getReferenceById(30L)).thenReturn(timeSlot());

        when(scheduleRepository.countBySemesterIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(0L);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatCode(() -> service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options()))
                .doesNotThrowAnyException();
    }

    @Test
    void generateSchedule_scopedByTurmaId_locksOtherActiveTurmaSchedules() {
        SubjectOffering turmaOffering = turmaOffering();

        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(Optional.of(semester()));
        when(turmaRepository.findByIdAndInstitutionId(900L, INSTITUTION_ID)).thenReturn(Optional.of(turmaEntity(900L)));
        when(subjectOfferingRepository.findBySemesterId(SEMESTER_ID)).thenReturn(List.of(turmaOffering));
        when(professorRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(professor()));
        when(classroomRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(classroom()));
        when(timeSlotRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(timeSlot()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));

        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID, null, 900L))
                .thenReturn(null);

        Schedule otherActiveSchedule = new Schedule();
        otherActiveSchedule.setId(77L);
        when(scheduleRepository.findAllBySemesterIdAndStatusAndInstitutionId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID))
                .thenReturn(List.of(otherActiveSchedule));

        Subject otherSubject = new Subject();
        otherSubject.setId(160L);
        SubjectOffering otherOffering = new SubjectOffering();
        otherOffering.setId(601L);
        otherOffering.setSubject(otherSubject);
        otherOffering.setTurma(turmaEntity(901L));
        otherOffering.setExpectedStudents(30);

        ScheduleEntry otherEntry = new ScheduleEntry();
        otherEntry.setSubjectOffering(otherOffering);
        when(scheduleEntryRepository.findByScheduleId(77L)).thenReturn(List.of(otherEntry));
        when(requestMapper.toLockedAssignmentInput(otherEntry))
                .thenReturn(new LockedAssignmentInput(601L, 11L, 21L, 31L));

        when(requestMapper.buildRequest(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mock(OptimizationRequest.class));

        // The solver echoes the borrowed locked assignment (offering 601,
        // turma 901) back in the solution too, since it became a fixed x
        // variable in the model — the service must not persist it as part
        // of this (turma 900-scoped) schedule.
        OptimizationResponse response = new OptimizationResponse(List.of(
                new ScheduleEntryOutput(10L, 600L, 20L, 30L),
                new ScheduleEntryOutput(11L, 601L, 21L, 31L)
        ));
        when(optimizerClient.optimize(any())).thenReturn(response);

        when(professorRepository.getReferenceById(10L)).thenReturn(professor());
        when(subjectOfferingRepository.getReferenceById(600L)).thenReturn(turmaOffering);
        when(classroomRepository.getReferenceById(20L)).thenReturn(classroom());
        when(timeSlotRepository.getReferenceById(30L)).thenReturn(timeSlot());

        when(scheduleRepository.countBySemesterIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(0L);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleGenerationRequest scopedOptions = new ScheduleGenerationRequest(5.0, 5.0, 0.0, 5.0, null, null, null, null, 900L);
        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, scopedOptions);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ScheduleEntry>> savedEntriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(scheduleEntryRepository).saveAll(savedEntriesCaptor.capture());
        assertThat(savedEntriesCaptor.getValue())
                .extracting(e -> e.getSubjectOffering().getId())
                .containsExactly(600L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LockedAssignmentInput>> lockedCaptor = ArgumentCaptor.forClass(List.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SubjectOffering>> offeringsCaptor = ArgumentCaptor.forClass(List.class);
        verify(requestMapper).buildRequest(any(), offeringsCaptor.capture(), any(), any(), any(), any(), lockedCaptor.capture(), any());

        assertThat(lockedCaptor.getValue()).containsExactly(new LockedAssignmentInput(601L, 11L, 21L, 31L));

        // The optimizer needs offering 601's own data (qualifications,
        // availability, capacity) to validate the locked assignment above —
        // even though it belongs to turma 901, not the scoped turma 900.
        assertThat(offeringsCaptor.getValue())
                .extracting(SubjectOffering::getId)
                .containsExactlyInAnyOrder(600L, 601L);
    }

    // -------------------- Demo guardrails --------------------

    @Test
    void demoInstitution_requestingASolverTimeLimitAbove15Seconds_getsItClampedByTheGuardrail() {
        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(Optional.of(semester()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(demoInstitution()));
        when(subjectOfferingRepository.findBySemesterId(SEMESTER_ID)).thenReturn(List.of(offering()));
        when(professorRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(professor()));
        when(classroomRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(classroom()));
        when(timeSlotRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(timeSlot()));
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID, null, null))
                .thenReturn(null);
        when(demoGenerationGuardrail.capSolverTimeLimit(300.0)).thenReturn(15.0);

        when(requestMapper.buildRequest(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mock(OptimizationRequest.class));
        OptimizationResponse response = new OptimizationResponse(List.of(new ScheduleEntryOutput(10L, 500L, 20L, 30L)));
        when(optimizerClient.optimize(any())).thenReturn(response);
        when(professorRepository.getReferenceById(10L)).thenReturn(professor());
        when(subjectOfferingRepository.getReferenceById(500L)).thenReturn(offering());
        when(classroomRepository.getReferenceById(20L)).thenReturn(classroom());
        when(timeSlotRepository.getReferenceById(30L)).thenReturn(timeSlot());
        when(scheduleRepository.countBySemesterIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(0L);
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleGenerationRequest requestWith300s = new ScheduleGenerationRequest(5.0, 5.0, 0.0, 5.0, null, null, null, 300.0, null);
        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, requestWith300s);

        ArgumentCaptor<Double> timeLimitCaptor = ArgumentCaptor.forClass(Double.class);
        verify(requestMapper).buildRequest(any(), any(), any(), any(), any(), any(), any(), timeLimitCaptor.capture());
        assertThat(timeLimitCaptor.getValue()).isEqualTo(15.0);
        verify(demoGenerationGuardrail).checkGenerationLimit(INSTITUTION_ID);
    }

    @Test
    void demoInstitution_pastItsGenerationLimit_isRejectedBeforeCallingTheOptimizer() {
        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID)).thenReturn(Optional.of(semester()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(demoInstitution()));
        doThrow(new com.vinibarros.optisched.exception.DemoGenerationLimitExceededException("limit reached"))
                .when(demoGenerationGuardrail).checkGenerationLimit(INSTITUTION_ID);

        assertThatThrownBy(() -> service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options()))
                .isInstanceOf(com.vinibarros.optisched.exception.DemoGenerationLimitExceededException.class);

        verifyNoInteractions(optimizerClient);
        verify(turmaOfferingSyncService, never()).syncOfferings(any(), any());
    }
}
