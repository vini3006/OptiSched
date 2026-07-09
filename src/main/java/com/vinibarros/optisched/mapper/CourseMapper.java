package com.vinibarros.optisched.mapper;


import com.vinibarros.optisched.dto.request.CourseRequest;
import com.vinibarros.optisched.dto.response.CourseResponse;
import com.vinibarros.optisched.entity.Course;
import org.springframework.stereotype.Component;

@Component
public class CourseMapper {

    public Course toEntity(CourseRequest request){
        Course course = new Course();
        course.setName(request.name());
        return course;
    }

    public CourseResponse toResponse(Course course){
        return new CourseResponse(
                course.getId(),
                course.getName()
        );
    }
}
