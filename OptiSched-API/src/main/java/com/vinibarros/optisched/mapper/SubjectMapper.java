package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.SubjectRequest;
import com.vinibarros.optisched.dto.response.SubjectResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Subject;
import org.springframework.stereotype.Component;

@Component
public class SubjectMapper {

    public Subject toEntity(SubjectRequest request, Institution institution){
        Subject subject = new Subject();
        subject.setCode(request.code());
        subject.setName(request.name());
        subject.setWorkload(request.workload());
        subject.setRequiredRoomType(request.requiredRoomType());
        subject.setInstitution(institution);
        return subject;
    }

    public SubjectResponse toResponse(Subject subject){
        return new SubjectResponse(
                subject.getId(),
                subject.getCode(),
                subject.getName(),
                subject.getWorkload(),
                subject.getRequiredRoomType()
        );
    }
}
