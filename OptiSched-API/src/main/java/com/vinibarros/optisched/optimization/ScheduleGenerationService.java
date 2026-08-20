package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.dto.request.ScheduleGenerationRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import com.vinibarros.optisched.exception.NoScheduleEntriesException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.*;
import com.vinibarros.optisched.service.TurmaOfferingSyncService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ScheduleGenerationService {

    private final ProfessorRepository professorRepository;
    private final SubjectOfferingRepository subjectOfferingRepository;
    private final ClassroomRepository classroomRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final SemesterRepository semesterRepository;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final InstitutionRepository institutionRepository;
    private final CourseRepository courseRepository;
    private final TurmaRepository turmaRepository;
    private final TurmaOfferingSyncService turmaOfferingSyncService;
    private final OptimizationRequestMapper requestMapper;
    private final OptimizerClient optimizerClient;
    private final EmailSender emailSender;

    public ScheduleGenerationService(
            ProfessorRepository professorRepository,
            SubjectOfferingRepository subjectOfferingRepository,
            ClassroomRepository classroomRepository,
            TimeSlotRepository timeSlotRepository,
            SemesterRepository semesterRepository,
            ScheduleRepository scheduleRepository,
            ScheduleMapper scheduleMapper,
            ScheduleEntryRepository scheduleEntryRepository,
            InstitutionRepository institutionRepository,
            CourseRepository courseRepository,
            TurmaRepository turmaRepository,
            TurmaOfferingSyncService turmaOfferingSyncService,
            OptimizationRequestMapper requestMapper,
            OptimizerClient optimizerClient,
            EmailSender emailSender
    ) {
        this.professorRepository = professorRepository;
        this.subjectOfferingRepository = subjectOfferingRepository;
        this.classroomRepository = classroomRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.semesterRepository = semesterRepository;
        this.scheduleRepository = scheduleRepository;
        this.scheduleMapper = scheduleMapper;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.institutionRepository = institutionRepository;
        this.courseRepository = courseRepository;
        this.turmaRepository = turmaRepository;
        this.turmaOfferingSyncService = turmaOfferingSyncService;
        this.requestMapper = requestMapper;
        this.optimizerClient = optimizerClient;
        this.emailSender = emailSender;
    }

    @Transactional
    public ScheduleResponse generateSchedule(Long semesterId, Long institutionId, ScheduleGenerationRequest options) {
        Semester semester = semesterRepository.findByIdAndInstitutionId(semesterId, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", semesterId));

        turmaOfferingSyncService.syncOfferings(institutionId, semester);

        Course course = options.courseId() != null
                ? courseRepository.findByIdAndInstitutionId(options.courseId(), institutionId)
                        .orElseThrow(() -> new ResourceNotFoundException("Course", options.courseId()))
                : null;

        Turma turma = options.turmaId() != null
                ? turmaRepository.findByIdAndInstitutionId(options.turmaId(), institutionId)
                        .orElseThrow(() -> new ResourceNotFoundException("Turma", options.turmaId()))
                : null;

        List<SubjectOffering> offerings = subjectOfferingRepository.findBySemesterId(semesterId).stream()
                .filter(o -> course == null || (o.getCourse() != null && o.getCourse().getId().equals(course.getId())))
                .filter(o -> turma == null || (o.getTurma() != null && o.getTurma().getId().equals(turma.getId())))
                .toList();

        if (offerings.isEmpty()) {
            throw new InvalidScheduleException(
                    "No eligible subject offerings found for semester " + semesterId
            );
        }

        List<Professor> professors = professorRepository.findAllByInstitutionId(institutionId);
        List<Classroom> classrooms = classroomRepository.findAllByInstitutionId(institutionId);
        List<TimeSlot> timeSlots = timeSlotRepository.findAllByInstitutionId(institutionId);

        ObjectiveWeightsInput weights = new ObjectiveWeightsInput(
                options.compactSchedule(),
                options.weeklyDistribution(),
                options.subjectBlocking(),
                options.classroomStability(),
                options.preferredShift() != null && options.preferredShiftWeight() != null
                        ? options.preferredShiftWeight()
                        : 0.0
        );

        List<Long> preferredTimeSlotIds = options.preferredShift() != null
                ? timeSlots.stream()
                        .filter(t -> requestMapper.matchesShift(t.getStartTime(), options.preferredShift()))
                        .map(TimeSlot::getId)
                        .toList()
                : Collections.emptyList();

        // Aulas travadas na grade ativa anterior DESTE curso/turma (ou da
        // grade completa, se nem courseId nem turmaId forem informados) são
        // repassadas ao otimizador como atribuições fixas, para que a nova
        // geração as mantenha exatamente como estão.
        Long courseId = course != null ? course.getId() : null;
        Long turmaId = turma != null ? turma.getId() : null;
        Schedule previousActive = scheduleRepository.findBySemesterIdAndStatusAndInstitutionIdAndCourseIdAndTurmaId(
                semesterId, ScheduleStatus.ACTIVE, institutionId, courseId, turmaId
        );
        List<LockedAssignmentInput> lockedAssignments = new java.util.ArrayList<>();
        if (previousActive != null) {
            scheduleEntryRepository.findByScheduleIdAndLockedTrue(previousActive.getId()).stream()
                    .map(requestMapper::toLockedAssignmentInput)
                    .forEach(lockedAssignments::add);
        }

        // Geração escopada a um curso ou turma específico: as aulas já
        // comprometidas nas grades ATIVAS de outros cursos/turmas do mesmo
        // semestre entram como atribuições fixas adicionais (mesmo mecanismo
        // de lock acima, fonte diferente), para que o solver nunca escale
        // professor/sala já ocupado por outro curso/turma. Sem escopo
        // (courseId e turmaId nulos, grade completa), não existem "outras
        // grades" — tudo está sendo gerado junto, como sempre foi.
        if (course != null || turma != null) {
            Long previousActiveId = previousActive != null ? previousActive.getId() : null;
            scheduleRepository.findAllBySemesterIdAndStatusAndInstitutionId(semesterId, ScheduleStatus.ACTIVE, institutionId).stream()
                    .filter(s -> !s.getId().equals(previousActiveId))
                    .flatMap(s -> scheduleEntryRepository.findByScheduleId(s.getId()).stream())
                    .map(requestMapper::toLockedAssignmentInput)
                    .forEach(lockedAssignments::add);
        }

        OptimizationRequest request = requestMapper.buildRequest(
                professors, offerings, classrooms, timeSlots, weights, preferredTimeSlotIds, lockedAssignments,
                options.solverTimeLimitSeconds()
        );

        OptimizationResponse response = optimizerClient.optimize(request);

        if (response == null || response.scheduleEntries() == null) {
            throw new NoScheduleEntriesException("The optimizer did not found any feasible entry.");
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        if (previousActive != null) {
            previousActive.setStatus(ScheduleStatus.INACTIVE);
            scheduleRepository.save(previousActive);
        }

        Schedule schedule = scheduleMapper.toEntity(semester, institution, course, turma);
        schedule.setGeneratedAt(LocalDateTime.now());
        schedule.setStatus(ScheduleStatus.ACTIVE);
        schedule.setVersion((int) scheduleRepository.countBySemesterIdAndInstitutionId(semesterId, institutionId) + 1);

        Schedule saved = scheduleRepository.save(schedule);
        ScheduleResponse scheduleResponse = scheduleMapper.toResponse(saved);

        List<ScheduleEntry> entries = response.scheduleEntries().stream().map(output -> {
            ScheduleEntry entry = new ScheduleEntry();
            entry.setSchedule(saved);
            entry.setProfessor(professorRepository.getReferenceById(output.professorId()));
            entry.setSubjectOffering(subjectOfferingRepository.getReferenceById(output.subjectOfferingId()));
            entry.setClassroom(classroomRepository.getReferenceById(output.classroomId()));
            entry.setTimeSlot(timeSlotRepository.getReferenceById(output.timeSlotId()));
            entry.setInstitution(institution);
            return entry;
        }).toList();

        scheduleEntryRepository.saveAll(entries);

        notifyAffectedProfessors(response.scheduleEntries(), professors);

        return scheduleResponse;
    }

    private void notifyAffectedProfessors(List<ScheduleEntryOutput> scheduleEntries, List<Professor> professors) {
        Map<Long, Professor> professorsById = professors.stream()
                .collect(Collectors.toMap(Professor::getId, p -> p));

        scheduleEntries.stream()
                .map(ScheduleEntryOutput::professorId)
                .distinct()
                .map(professorsById::get)
                .filter(Objects::nonNull)
                .filter(p -> p.getUser() != null)
                .forEach(p -> emailSender.sendScheduleChangedEmail(p.getUser().getEmail(), p.getName()));
    }
}
