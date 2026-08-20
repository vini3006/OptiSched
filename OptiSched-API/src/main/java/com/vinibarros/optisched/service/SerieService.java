package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SerieRequest;
import com.vinibarros.optisched.dto.response.SerieResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SerieMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.util.InstitutionTypeUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SerieService {

    private final SerieRepository serieRepository;
    private final InstitutionRepository institutionRepository;
    private final SerieMapper serieMapper;

    public SerieService(SerieRepository serieRepository, InstitutionRepository institutionRepository, SerieMapper serieMapper){
        this.serieRepository = serieRepository;
        this.institutionRepository = institutionRepository;
        this.serieMapper = serieMapper;
    }

    @Transactional
    public SerieResponse create(SerieRequest request, Long institutionId){
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.SCHOOL, "create a serie");

        if (serieRepository.findByNameAndInstitutionId(request.name(), institutionId).isPresent()) {
            throw new DuplicateResourceException("Serie", "name", request.name());
        }

        Serie serie = serieMapper.toEntity(request, institution);
        Serie saved = serieRepository.save(serie);
        return serieMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SerieResponse findById(Long id, Long institutionId){
        Serie serie = serieRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Serie", id));

        return serieMapper.toResponse(serie);
    }

    @Transactional(readOnly = true)
    public List<SerieResponse> findAll(Long institutionId){
        return serieRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(serieMapper::toResponse)
                .toList();
    }

    @Transactional
    public SerieResponse update(Long id, SerieRequest request, Long institutionId){
        Serie serie = serieRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Serie", id));

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.SCHOOL, "update a serie");

        if (!serie.getName().equalsIgnoreCase(request.name()) &&
                serieRepository.findByNameAndInstitutionId(request.name(), institutionId).isPresent()) {
            throw new DuplicateResourceException("Serie", "name", request.name());
        }

        serie.setName(request.name());
        serie.setOrder(request.order());

        Serie updated = serieRepository.save(serie);
        return serieMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!serieRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("Serie", id);
        }
        try {
            serieRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Serie cannot be deleted because it is referenced by existing Turma or SerieSubject records");
        }
    }
}
