package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.dto.request.ScheduleGenerationRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.PreferredShift;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import com.vinibarros.optisched.exception.NoScheduleEntriesException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
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
        this.requestMapper = requestMapper;
        this.optimizerClient = optimizerClient;
        this.emailSender = emailSender;
    }

    @Transactional
    public ScheduleResponse generateSchedule(Long semesterId, Long institutionId, ScheduleGenerationRequest options) {
        Semester semester = semesterRepository.findByIdAndInstitutionId(semesterId, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", semesterId));

        List<SubjectOffering> offerings = subjectOfferingRepository.findBySemesterId(semesterId).stream()
                .filter(o -> o.getRecommendedSemester() != null)
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
                        .filter(t -> matchesShift(t.getStartTime(), options.preferredShift()))
                        .map(TimeSlot::getId)
                        .toList()
                : Collections.emptyList();

        // Aulas travadas na grade ativa anterior (do mesmo semestre) são
        // repassadas ao otimizador como atribuições fixas, para que a nova
        // geração as mantenha exatamente como estão.
        Schedule previousActive = scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(
                semesterId, ScheduleStatus.ACTIVE, institutionId
        );
        List<LockedAssignmentInput> lockedAssignments = previousActive != null
                ? scheduleEntryRepository.findByScheduleIdAndLockedTrue(previousActive.getId()).stream()
                        .map(requestMapper::toLockedAssignmentInput)
                        .toList()
                : Collections.emptyList();

        OptimizationRequest request = requestMapper.buildRequest(
                professors, offerings, classrooms, timeSlots, weights, preferredTimeSlotIds, lockedAssignments
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

        Schedule schedule = scheduleMapper.toEntity(semester, institution);
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

    private boolean matchesShift(LocalTime startTime, PreferredShift shift) {
        return switch (shift) {
            case MORNING -> startTime.isBefore(LocalTime.NOON);
            case AFTERNOON -> !startTime.isBefore(LocalTime.NOON) && startTime.isBefore(LocalTime.of(18, 0));
            case EVENING -> !startTime.isBefore(LocalTime.of(18, 0));
        };
    }
}
