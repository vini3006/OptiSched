package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.AvailabilityRequest;
import com.vinibarros.optisched.dto.response.AvailabilityResponse;
import com.vinibarros.optisched.entity.Availability;
import com.vinibarros.optisched.entity.AvailabilityId;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.TimeSlot;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.AvailabilityMapper;
import com.vinibarros.optisched.repository.AvailabilityRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.TimeSlotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final ProfessorRepository professorRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final AvailabilityMapper availabilityMapper;

    public AvailabilityService(AvailabilityRepository availabilityRepository, ProfessorRepository professorRepository, TimeSlotRepository timeSlotRepository, AvailabilityMapper availabilityMapper){
        this.availabilityRepository = availabilityRepository;
        this.professorRepository = professorRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.availabilityMapper = availabilityMapper;
    }

    @Transactional
    public AvailabilityResponse create(AvailabilityRequest request){
        AvailabilityId id = new AvailabilityId(request.professorId(), request.timeSlotId());

        if(availabilityRepository.existsById(id)){
            throw new DuplicateResourceException("Availability already exists for professorId= " + request.professorId() + " and TimeSlotId= " + request.timeSlotId());
        }

        Professor professor = professorRepository.findById(request.professorId())
                .orElseThrow(() -> new ResourceNotFoundException("Professor", request.professorId()));

        TimeSlot timeSlot = timeSlotRepository.findById(request.timeSlotId())
                .orElseThrow(() -> new ResourceNotFoundException("TimeSlot", request.timeSlotId()));

        Availability availability = availabilityMapper.toEntity(professor, timeSlot);
        Availability saved = availabilityRepository.save(availability);
        return availabilityMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> findAll(){
        return availabilityRepository.findAll()
                .stream()
                .map(availabilityMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> findByProfessor(Long professorId){
        if(!professorRepository.existsById(professorId)) {
            throw new ResourceNotFoundException("Professor", professorId);
        }

        return availabilityRepository.findByProfessorId(professorId)
                .stream()
                .map(availabilityMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> findByTimeSlot(Long timeSlotId){
        if(!timeSlotRepository.existsById(timeSlotId)){
            throw new ResourceNotFoundException("TimeSlot", timeSlotId);
        }

        return availabilityRepository.findByTimeSlotId(timeSlotId)
                .stream()
                .map(availabilityMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> findByProfessorAndTimeSlot(Long professorId, Long timeSlotId){
        AvailabilityId id = new AvailabilityId(professorId, timeSlotId);
        if(!availabilityRepository.existsById(id)){
            throw new ResourceNotFoundException("Availability not found for professorId=" + professorId + " and timeSlotId=" + timeSlotId);
        }

        return availabilityRepository.findByProfessorIdAndTimeSlotId(professorId, timeSlotId)
                .stream()
                .map(availabilityMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long professorId, Long timeSlotId){
        AvailabilityId id = new AvailabilityId(professorId, timeSlotId);
        if(!availabilityRepository.existsById(id)){
            throw new ResourceNotFoundException("Availability not found for professorId=" + professorId + " and timeSlotId=" + timeSlotId);
        }
        availabilityRepository.deleteById(id);
    }
}
