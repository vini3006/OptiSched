package com.vinibarros.optisched.service;


import com.vinibarros.optisched.dto.request.CourseRequest;
import com.vinibarros.optisched.dto.response.CourseResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.CourseMapper;
import com.vinibarros.optisched.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;

    public CourseService(CourseRepository courseRepository, CourseMapper courseMapper){
        this.courseRepository = courseRepository;
        this.courseMapper = courseMapper;
    }

    @Transactional
    public CourseResponse create(CourseRequest request){
        Course course = courseMapper.toEntity(request);
        Course saved = courseRepository.save(course);
        return courseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public CourseResponse findById(Long id){
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        return courseMapper.toResponse(course);
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> findAll(){
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional
    public CourseResponse update(Long id, CourseRequest request){
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        course.setName(request.name());

        Course updated = courseRepository.save(course);
        return courseMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id){
        if(!courseRepository.existsById(id)){
            throw new ResourceNotFoundException("Course", id);
        }
        courseRepository.deleteById(id);
    }
}
