package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.SerieSubjectResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.entity.SerieSubject;
import com.vinibarros.optisched.entity.Subject;
import org.springframework.stereotype.Component;

@Component
public class SerieSubjectMapper {

    public SerieSubject toEntity(Serie serie, Subject subject, Integer weeklyWorkload, Institution institution){
        SerieSubject serieSubject = new SerieSubject();
        serieSubject.setSerie(serie);
        serieSubject.setSubject(subject);
        serieSubject.setWeeklyWorkload(weeklyWorkload);
        serieSubject.setInstitution(institution);
        return serieSubject;
    }

    public SerieSubjectResponse toResponse(SerieSubject serieSubject){
        return new SerieSubjectResponse(
                serieSubject.getSerie().getId(),
                serieSubject.getSerie().getName(),
                serieSubject.getSubject().getId(),
                serieSubject.getSubject().getCode(),
                serieSubject.getSubject().getName(),
                serieSubject.getWeeklyWorkload()
        );
    }
}
