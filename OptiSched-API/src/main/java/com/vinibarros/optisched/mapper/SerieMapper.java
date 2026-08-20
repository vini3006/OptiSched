package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.SerieRequest;
import com.vinibarros.optisched.dto.response.SerieResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import org.springframework.stereotype.Component;

@Component
public class SerieMapper {

    public Serie toEntity(SerieRequest request, Institution institution){
        Serie serie = new Serie();
        serie.setName(request.name());
        serie.setOrder(request.order());
        serie.setInstitution(institution);
        return serie;
    }

    public SerieResponse toResponse(Serie serie){
        return new SerieResponse(
                serie.getId(),
                serie.getName(),
                serie.getOrder()
        );
    }
}
