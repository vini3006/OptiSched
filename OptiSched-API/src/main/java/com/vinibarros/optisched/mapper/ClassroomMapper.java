package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.ClassroomRequest;
import com.vinibarros.optisched.dto.response.ClassroomResponse;
import com.vinibarros.optisched.entity.Classroom;
import com.vinibarros.optisched.entity.Institution;
import org.springframework.stereotype.Component;

@Component
public class ClassroomMapper {

    public Classroom toEntity(ClassroomRequest request, Institution institution) {
        Classroom classroom = new Classroom();

        classroom.setNumber(request.number());
        classroom.setCapacity(request.capacity());
        classroom.setType(request.type());
        classroom.setInstitution(institution);

        return classroom;
    }

    public ClassroomResponse toResponse(Classroom classroom) {
        return new ClassroomResponse(
                classroom.getId(),
                classroom.getNumber(),
                classroom.getCapacity(),
                classroom.getType()
        );
    }
}