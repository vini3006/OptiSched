package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ScheduleRequest;
import com.vinibarros.optisched.dto.response.EntryDiff;
import com.vinibarros.optisched.dto.response.ScheduleComparisonResponse;
import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final SemesterRepository semesterRepository;
    private final InstitutionRepository institutionRepository;
    private final ScheduleMapper scheduleMapper;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ScheduleEntryMapper scheduleEntryMapper;

    public ScheduleService(ScheduleRepository scheduleRepository, SemesterRepository semesterRepository, InstitutionRepository institutionRepository, ScheduleMapper scheduleMapper, ScheduleEntryRepository scheduleEntryRepository, ScheduleEntryMapper scheduleEntryMapper){
        this.scheduleRepository = scheduleRepository;
        this.semesterRepository = semesterRepository;
        this.institutionRepository = institutionRepository;
        this.scheduleMapper = scheduleMapper;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.scheduleEntryMapper = scheduleEntryMapper;
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest request, Long institutionId){
        Semester semester = semesterRepository.findByIdAndInstitutionId(request.semesterId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", request.semesterId()));

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        if(scheduleRepository.existsBySemesterIdAndStatusAndInstitutionId(request.semesterId(), ScheduleStatus.ACTIVE, institutionId)){
            Schedule deactivated = scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(request.semesterId(), ScheduleStatus.ACTIVE, institutionId);
            if (deactivated != null) {
                deactivated.setStatus(ScheduleStatus.INACTIVE);
            }
        }

        Schedule schedule = scheduleMapper.toEntity(semester, institution);
        schedule.setGeneratedAt(LocalDateTime.now());
        schedule.setStatus(ScheduleStatus.ACTIVE);
        schedule.setVersion((int) scheduleRepository.countBySemesterIdAndInstitutionId(request.semesterId(), institutionId) + 1);

        Schedule saved = scheduleRepository.save(schedule);
        return scheduleMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ScheduleResponse findById(Long id, Long institutionId){
        Schedule schedule = scheduleRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        return scheduleMapper.toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public ScheduleResponse findActive(Long institutionId){
        Schedule schedule = scheduleRepository.findFirstByInstitutionIdAndStatusOrderByGeneratedAtDesc(institutionId, ScheduleStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active schedule found for this institution."));
        return scheduleMapper.toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> findAll(Long institutionId, Long semesterId){
        List<Schedule> schedules = semesterId != null
                ? scheduleRepository.findAllByInstitutionIdAndSemesterId(institutionId, semesterId)
                : scheduleRepository.findAllByInstitutionId(institutionId);

        return schedules.stream()
                .map(scheduleMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ScheduleComparisonResponse compare(Long id, Long otherId, Long institutionId){
        Schedule schedule = scheduleRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        Schedule other = scheduleRepository.findByIdAndInstitutionId(otherId, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", otherId));

        if (!schedule.getSemester().getId().equals(other.getSemester().getId())) {
            throw new InvalidScheduleException("Only generations of the same semester can be compared.");
        }

        // Uma oferta pode ter mais de uma aula por semana (ex.: 2x), então o
        // agrupamento é por lista, não por valor único — e a comparação é por
        // conjunto de (professor, sala, horário), não por igualdade posicional.
        Map<Long, List<ScheduleEntryResponse>> entriesByOffering = scheduleEntryRepository.findByScheduleId(id).stream()
                .map(scheduleEntryMapper::toResponse)
                .collect(Collectors.groupingBy(ScheduleEntryResponse::subjectOfferingId));
        Map<Long, List<ScheduleEntryResponse>> otherEntriesByOffering = scheduleEntryRepository.findByScheduleId(otherId).stream()
                .map(scheduleEntryMapper::toResponse)
                .collect(Collectors.groupingBy(ScheduleEntryResponse::subjectOfferingId));

        List<EntryDiff> changed = new java.util.ArrayList<>();
        List<ScheduleEntryResponse> onlyInA = new java.util.ArrayList<>();
        List<ScheduleEntryResponse> onlyInB = new java.util.ArrayList<>();

        for (Map.Entry<Long, List<ScheduleEntryResponse>> entry : entriesByOffering.entrySet()) {
            List<ScheduleEntryResponse> before = entry.getValue();
            List<ScheduleEntryResponse> after = otherEntriesByOffering.get(entry.getKey());

            if (after == null) {
                onlyInA.addAll(before);
            } else if (!assignmentSignature(before).equals(assignmentSignature(after))) {
                ScheduleEntryResponse first = before.get(0);
                changed.add(new EntryDiff(first.subjectOfferingId(), first.subjectName(), first.courseName(), before, after));
            }
        }

        for (Map.Entry<Long, List<ScheduleEntryResponse>> entry : otherEntriesByOffering.entrySet()) {
            if (!entriesByOffering.containsKey(entry.getKey())) {
                onlyInB.addAll(entry.getValue());
            }
        }

        return new ScheduleComparisonResponse(changed, onlyInA, onlyInB);
    }

    private java.util.Set<String> assignmentSignature(List<ScheduleEntryResponse> entries) {
        return entries.stream()
                .map(e -> e.professorId() + ":" + e.classroomId() + ":" + e.timeSlotId())
                .collect(Collectors.toSet());
    }

    @Transactional
    public ScheduleResponse alterStatus(Long id, Long institutionId){
        Schedule schedule = scheduleRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));

        if(schedule.getStatus() == ScheduleStatus.ACTIVE){
            schedule.setStatus(ScheduleStatus.INACTIVE);
        } else {
            Schedule active = scheduleRepository.findBySemesterIdAndStatusAndInstitutionId(schedule.getSemester().getId(), ScheduleStatus.ACTIVE, institutionId);

            if(active != null){
                active.setStatus(ScheduleStatus.INACTIVE);
            }

            schedule.setStatus(ScheduleStatus.ACTIVE);
        }

        Schedule updated = scheduleRepository.save(schedule);
        return scheduleMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        Schedule schedule = scheduleRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));

        try {
            // Deleting the JPA entity (rather than deleteById) lets the
            // scheduleEntries cascade/orphanRemoval clean up its own
            // ScheduleEntry rows first — a schedule's entries have no
            // meaning outside of it, unlike master data (Professor,
            // Course, etc.) where deletion is blocked instead.
            scheduleRepository.delete(schedule);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Schedule cannot be deleted because it is still referenced by other records.");
        }
    }
}
