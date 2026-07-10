package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleEntryMapper;
import com.vinibarros.optisched.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.List;

@Service
public class ScheduleEntryService {

    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ScheduleRepository scheduleRepository;
    private final ProfessorRepository professorRepository;
    private final ClassroomRepository classroomRepository;
    private final ScheduleEntryMapper scheduleEntryMapper;

    public ScheduleEntryService(ScheduleEntryRepository scheduleEntryRepository, ScheduleRepository scheduleRepository, ProfessorRepository professorRepository, ClassroomRepository classroomRepository, ScheduleEntryMapper scheduleEntryMapper){
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.scheduleRepository = scheduleRepository;
        this.professorRepository = professorRepository;
        this.classroomRepository = classroomRepository;
        this.scheduleEntryMapper = scheduleEntryMapper;
    }

    @Transactional
    public ScheduleEntryResponse createEntry(Schedule schedule, SubjectOffering subjectOffering, Professor professor, Classroom classroom, TimeSlot timeSlot){
        if (scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotId(
                schedule.getId(),
                classroom.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "Classroom is already occupied at this time slot."
            );
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndTimeSlotId(
                schedule.getId(),
                professor.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "Professor is already assigned at this time slot."
            );
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndSubjectOfferingIdAndClassroomIdAndTimeSlotId(
                schedule.getId(),
                professor.getId(),
                subjectOffering.getId(),
                classroom.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "ScheduleEntry already exists."
            );
        }

        ScheduleEntry scheduleEntry = new ScheduleEntry();
        scheduleEntry.setSchedule(schedule);
        scheduleEntry.setSubjectOffering(subjectOffering);
        scheduleEntry.setProfessor(professor);
        scheduleEntry.setClassroom(classroom);
        scheduleEntry.setTimeSlot(timeSlot);

        ScheduleEntry saved = scheduleEntryRepository.save(scheduleEntry);
        return scheduleEntryMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ScheduleEntryResponse findById(Long id){
        ScheduleEntry scheduleEntry = scheduleEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));
        return scheduleEntryMapper.toResponse(scheduleEntry);
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findBySchedule(Long scheduleId){
        if(!scheduleRepository.existsById(scheduleId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        return scheduleEntryRepository.findByScheduleId(scheduleId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndProfessor(Long scheduleId, Long professorId){
        if(!scheduleRepository.existsById(scheduleId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        if(!professorRepository.existsById(professorId)){
            throw new ResourceNotFoundException("Professor", professorId);
        }

        return scheduleEntryRepository.findByScheduleIdAndProfessorId(scheduleId, professorId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndClassroom(Long scheduleId, Long classroomId){
        if(!scheduleRepository.existsById(scheduleId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        if(!classroomRepository.existsById(classroomId)){
            throw new ResourceNotFoundException("Classroom", classroomId);
        }

        return scheduleEntryRepository.findByScheduleIdAndClassroomId(scheduleId, classroomId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndDayOfWeek(Long scheduleId, DayOfWeek dayOfWeek){
        if(!scheduleRepository.existsById(scheduleId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        return scheduleEntryRepository.findByScheduleIdAndTimeSlotDayOfWeek(scheduleId, dayOfWeek)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }
}
