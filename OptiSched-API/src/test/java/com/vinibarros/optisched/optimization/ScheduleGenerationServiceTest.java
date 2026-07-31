package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.dto.request.ScheduleGenerationRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.*;
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
    @Mock private OptimizationRequestMapper requestMapper;
    @Mock private OptimizerClient optimizerClient;
    @Mock private EmailSender emailSender;

    private ScheduleGenerationService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleGenerationService(
                professorRepository, subjectOfferingRepository, classroomRepository, timeSlotRepository,
                semesterRepository, scheduleRepository, new ScheduleMapper(), scheduleEntryRepository,
                institutionRepository, requestMapper, optimizerClient, emailSender
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
        return new ScheduleGenerationRequest(5.0, 5.0, 0.0, 5.0, null, null);
    }

    private void stubCommonLookups() {
        when(semesterRepository.findByIdAndInstitutionId(SEMESTER_ID, INSTITUTION_ID))
                .thenReturn(Optional.of(semester()));
        when(subjectOfferingRepository.findBySemesterId(SEMESTER_ID)).thenReturn(List.of(offering()));
        when(professorRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(professor()));
        when(classroomRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(classroom()));
        when(timeSlotRepository.findAllByInstitutionId(INSTITUTION_ID)).thenReturn(List.of(timeSlot()));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));

        when(requestMapper.buildRequest(any(), any(), any(), any(), any(), any(), any()))
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
        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID))
                .thenReturn(null);

        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LockedAssignmentInput>> lockedCaptor = ArgumentCaptor.forClass(List.class);
        verify(requestMapper).buildRequest(any(), any(), any(), any(), any(), any(), lockedCaptor.capture());

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

        when(scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(SEMESTER_ID, ScheduleStatus.ACTIVE, INSTITUTION_ID))
                .thenReturn(previousActive);
        when(scheduleEntryRepository.findByScheduleIdAndLockedTrue(99L)).thenReturn(List.of(lockedEntry));
        when(requestMapper.toLockedAssignmentInput(lockedEntry))
                .thenReturn(new LockedAssignmentInput(500L, 10L, 20L, 30L));

        service.generateSchedule(SEMESTER_ID, INSTITUTION_ID, options());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LockedAssignmentInput>> lockedCaptor = ArgumentCaptor.forClass(List.class);
        verify(requestMapper).buildRequest(any(), any(), any(), any(), any(), any(), lockedCaptor.capture());

        assertThat(lockedCaptor.getValue()).containsExactly(new LockedAssignmentInput(500L, 10L, 20L, 30L));
        assertThat(previousActive.getStatus()).isEqualTo(ScheduleStatus.INACTIVE);
    }
}
