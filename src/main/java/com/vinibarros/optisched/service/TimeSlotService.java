package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.TimeSlotRequest;
import com.vinibarros.optisched.dto.response.TimeSlotResponse;
import com.vinibarros.optisched.entity.TimeSlot;
import com.vinibarros.optisched.exception.*;
import com.vinibarros.optisched.mapper.TimeSlotMapper;
import com.vinibarros.optisched.repository.TimeSlotRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.util.List;

@Service
public class TimeSlotService {

    private final TimeSlotRepository timeSlotRepository;
    private final TimeSlotMapper timeSlotMapper;

    public TimeSlotService(TimeSlotRepository timeSlotRepository, TimeSlotMapper timeSlotMapper){
        this.timeSlotRepository = timeSlotRepository;
        this.timeSlotMapper = timeSlotMapper;
    }

    @Transactional
    public TimeSlotResponse create(TimeSlotRequest request){
        if(!request.endTime().isAfter(request.startTime())){
            throw new InvalidTimeSlotException();
        }

        if(timeSlotRepository.existsByDayOfWeekAndStartTimeAndEndTime(request.dayOfWeek(), request.startTime(), request.endTime())){
            throw new DuplicateResourceException("TimeSlot already exists for day of week: " + request.dayOfWeek() + ", startTime: " + request.startTime() + " and EndTime: " + request.endTime());
        }

        if(timeSlotRepository.existsOverlappingTimeSlot(request.startTime(), request.endTime())){
            throw new OverlappingTimeSlotException("TimeSlot overlaps with an existing time range: " + request.startTime() + "-" + request.endTime());
        }

        TimeSlot timeSlot = timeSlotMapper.toEntity(request);
        TimeSlot saved = timeSlotRepository.save(timeSlot);
        return timeSlotMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TimeSlotResponse findById(Long id){
        TimeSlot timeSlot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSlot", id));
        return timeSlotMapper.toResponse(timeSlot);
    }

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> findAll(){
        return timeSlotRepository.findAll()
                .stream()
                .map(timeSlotMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> findByDayOfWeek(DayOfWeek dayOfWeek){
        return timeSlotRepository.findByDayOfWeek(dayOfWeek)
                .stream()
                .map(timeSlotMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long id){
        if(!timeSlotRepository.existsById(id)){
            throw new ResourceNotFoundException("TimeSlot", id);
        }
        try{
            timeSlotRepository.deleteById(id);
        } catch (DataIntegrityViolationException e){
            throw new ResourceInUseException("TimeSlot cannot be deleted because it is referenced by existing Availability or ScheduleEntry records");
        }
    }
}
