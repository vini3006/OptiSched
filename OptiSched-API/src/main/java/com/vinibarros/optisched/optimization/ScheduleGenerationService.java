package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.*;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
    private final OptimizationRequestMapper requestMapper;
    private final OptimizerClient optimizerClient;

    public ScheduleGenerationService(
            ProfessorRepository professorRepository,
            SubjectOfferingRepository subjectOfferingRepository,
            ClassroomRepository classroomRepository,
            TimeSlotRepository timeSlotRepository,
            SemesterRepository semesterRepository,
            ScheduleRepository scheduleRepository,
            ScheduleMapper scheduleMapper,
            ScheduleEntryRepository scheduleEntryRepository,
            OptimizationRequestMapper requestMapper,
            OptimizerClient optimizerClient
    ) {
        this.professorRepository = professorRepository;
        this.subjectOfferingRepository = subjectOfferingRepository;
        this.classroomRepository = classroomRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.semesterRepository = semesterRepository;
        this.scheduleRepository = scheduleRepository;
        this.scheduleMapper = scheduleMapper;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.requestMapper = requestMapper;
        this.optimizerClient = optimizerClient;
    }

    @Transactional
    public ScheduleResponse generateSchedule(Long semesterId) {
        Semester semester = semesterRepository.findById(semesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", semesterId));

        List<SubjectOffering> offerings = subjectOfferingRepository.findBySemesterId(semesterId).stream()
                .filter(o -> o.getRecommendedSemester() != null)
                .toList();

        if (offerings.isEmpty()) {
            throw new InvalidScheduleException(
                    "No eligible subject offerings found for semester " + semesterId
            );
        }

        List<Professor> professors = professorRepository.findAll();
        List<Classroom> classrooms = classroomRepository.findAll();
        List<TimeSlot> timeSlots = timeSlotRepository.findAll();

        OptimizationRequest request = requestMapper.buildRequest(
                professors, offerings, classrooms, timeSlots, ObjectiveWeightsInput.defaults()
        );

        OptimizationResponse response = optimizerClient.optimize(request);

        Schedule schedule = scheduleMapper.toEntity(semester);
        Schedule saved = scheduleRepository.save(schedule);
        ScheduleResponse scheduleResponse = scheduleMapper.toResponse(saved);

        List<ScheduleEntry> entries = response.scheduleEntries().stream().map(output -> {
            ScheduleEntry entry = new ScheduleEntry();
            entry.setSchedule(saved);
            entry.setProfessor(professorRepository.getReferenceById(output.professorId()));
            entry.setSubjectOffering(subjectOfferingRepository.getReferenceById(output.subjectOfferingId()));
            entry.setClassroom(classroomRepository.getReferenceById(output.classroomId()));
            entry.setTimeSlot(timeSlotRepository.getReferenceById(output.timeSlotId()));
            return entry;
        }).toList();

        scheduleEntryRepository.saveAll(entries);

        return scheduleResponse;
    }
}
