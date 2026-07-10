package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ScheduleRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.enums.ScheduleStatus;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleMapper;
import com.vinibarros.optisched.repository.ScheduleRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final SemesterRepository semesterRepository;
    private final ScheduleMapper scheduleMapper;

    public ScheduleService(ScheduleRepository scheduleRepository, SemesterRepository semesterRepository, ScheduleMapper scheduleMapper){
        this.scheduleRepository = scheduleRepository;
        this.semesterRepository = semesterRepository;
        this.scheduleMapper = scheduleMapper;
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest request){
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Semester", request.semesterId()));

        if(scheduleRepository.existsBySemesterIdAndStatus(request.semesterId(), ScheduleStatus.ACTIVE)){
            Schedule deactivated = scheduleRepository.findBySemesterIdAndStatus(request.semesterId(), ScheduleStatus.ACTIVE);
            deactivated.setStatus(ScheduleStatus.INACTIVE);
        }

        Schedule schedule = scheduleMapper.toEntity(semester);
        schedule.setGeneratedAt(LocalDateTime.now());
        schedule.setStatus(ScheduleStatus.ACTIVE);

        Schedule saved = scheduleRepository.save(schedule);
        return scheduleMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ScheduleResponse findById(Long id){
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        return scheduleMapper.toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> findAll(){
        return scheduleRepository.findAll()
                .stream()
                .map(scheduleMapper::toResponse)
                .toList();
    }

    @Transactional
    public ScheduleResponse alterStatus(Long id){
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));

        if(schedule.getStatus() == ScheduleStatus.ACTIVE){
            schedule.setStatus(ScheduleStatus.INACTIVE);
        } else {
            schedule.setStatus(ScheduleStatus.ACTIVE);
        }

        Schedule updated = scheduleRepository.save(schedule);
        return scheduleMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id){
        if(!scheduleRepository.existsById(id)){
            throw new ResourceNotFoundException("Schedule", id);
        }
        scheduleRepository.deleteById(id);
    }
}
