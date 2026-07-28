package com.vinibarros.optisched.service;


import com.vinibarros.optisched.dto.request.CourseRequest;
import com.vinibarros.optisched.dto.response.CourseResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.CourseMapper;
import com.vinibarros.optisched.repository.CourseRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final InstitutionRepository institutionRepository;
    private final CourseMapper courseMapper;

    public CourseService(CourseRepository courseRepository, InstitutionRepository institutionRepository, CourseMapper courseMapper){
        this.courseRepository = courseRepository;
        this.institutionRepository = institutionRepository;
        this.courseMapper = courseMapper;
    }

    @Transactional
    public CourseResponse create(CourseRequest request, Long institutionId){
        if (courseRepository.existsByNameAndInstitutionId(request.name(), institutionId)) {
            throw new DuplicateResourceException("Course", "name", request.name());
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        Course course = courseMapper.toEntity(request, institution);
        Course saved = courseRepository.save(course);
        return courseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public CourseResponse findById(Long id, Long institutionId){
        Course course = courseRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        return courseMapper.toResponse(course);
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> findAll(Long institutionId){
        return courseRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional
    public CourseResponse update(Long id, CourseRequest request, Long institutionId){
        Course course = courseRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        if (!course.getName().equalsIgnoreCase(request.name()) &&
                courseRepository.existsByNameAndInstitutionId(request.name(), institutionId)) {
            throw new DuplicateResourceException("Course", "name", request.name());
        }

        course.setName(request.name());
        course.setTotalSemesters(request.totalSemesters());

        Course updated = courseRepository.save(course);
        return courseMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!courseRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("Course", id);
        }
        courseRepository.deleteById(id);
    }
}
