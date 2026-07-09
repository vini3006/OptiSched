package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ClassroomRequest;
import com.vinibarros.optisched.dto.response.ClassroomResponse;
import com.vinibarros.optisched.entity.Classroom;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ClassroomMapper;
import com.vinibarros.optisched.repository.ClassroomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final ClassroomMapper classroomMapper;

    public ClassroomService(ClassroomRepository classroomRepository, ClassroomMapper classroomMapper){
        this.classroomRepository = classroomRepository;
        this.classroomMapper = classroomMapper;
    }

    @Transactional
    public ClassroomResponse create(ClassroomRequest request){
        if(classroomRepository.existsByNumber(request.number())){
            throw new DuplicateResourceException("Classroom", "number", request.number());
        }

        Classroom classroom = classroomMapper.toEntity(request);
        Classroom saved = classroomRepository.save(classroom);
        return classroomMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ClassroomResponse findById(Long id){
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));

        return classroomMapper.toResponse(classroom);
    }

    @Transactional(readOnly = true)
    public List<ClassroomResponse> findAll(){
        return classroomRepository.findAll()
                .stream()
                .map(classroomMapper::toResponse)
                .toList();
    }

    @Transactional
    public ClassroomResponse update(Long id, ClassroomRequest request){
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));

        if(!classroom.getNumber().equals(request.number()) && classroomRepository.existsByNumber(request.number())){
            throw new DuplicateResourceException("Classroom", "number", request.number());
        }

        classroom.setNumber(request.number());
        classroom.setCapacity(request.capacity());

        Classroom updated = classroomRepository.save(classroom);
        return classroomMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id){
        if(!classroomRepository.existsById(id)){
            throw new ResourceNotFoundException("Classroom", id);
        }

        classroomRepository.deleteById(id);
    }
}
