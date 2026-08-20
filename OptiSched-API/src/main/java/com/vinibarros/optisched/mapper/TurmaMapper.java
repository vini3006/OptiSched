package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.TurmaRequest;
import com.vinibarros.optisched.dto.response.TurmaResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.entity.Turma;
import org.springframework.stereotype.Component;

@Component
public class TurmaMapper {

    public Turma toEntity(TurmaRequest request, Serie serie, Institution institution){
        Turma turma = new Turma();
        turma.setName(request.name());
        turma.setShift(request.shift());
        turma.setExpectedStudents(request.expectedStudents());
        turma.setSerie(serie);
        turma.setYear(request.year());
        turma.setInstitution(institution);
        return turma;
    }

    public TurmaResponse toResponse(Turma turma){
        return new TurmaResponse(
                turma.getId(),
                turma.getName(),
                turma.getShift(),
                turma.getExpectedStudents(),
                turma.getSerie().getId(),
                turma.getYear()
        );
    }
}
