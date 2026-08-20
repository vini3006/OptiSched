package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.TurmaRequest;
import com.vinibarros.optisched.dto.response.TurmaResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.entity.Turma;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.TurmaMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.repository.TurmaRepository;
import com.vinibarros.optisched.util.InstitutionTypeUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TurmaService {

    private final TurmaRepository turmaRepository;
    private final SerieRepository serieRepository;
    private final InstitutionRepository institutionRepository;
    private final TurmaMapper turmaMapper;

    public TurmaService(TurmaRepository turmaRepository, SerieRepository serieRepository, InstitutionRepository institutionRepository, TurmaMapper turmaMapper){
        this.turmaRepository = turmaRepository;
        this.serieRepository = serieRepository;
        this.institutionRepository = institutionRepository;
        this.turmaMapper = turmaMapper;
    }

    @Transactional
    public TurmaResponse create(TurmaRequest request, Long institutionId){
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.SCHOOL, "create a turma");

        if (turmaRepository.findByNameAndInstitutionId(request.name(), institutionId).isPresent()) {
            throw new DuplicateResourceException("Turma", "name", request.name());
        }

        Serie serie = serieRepository.findByIdAndInstitutionId(request.serieId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Serie", request.serieId()));

        Turma turma = turmaMapper.toEntity(request, serie, institution);
        Turma saved = turmaRepository.save(turma);
        return turmaMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TurmaResponse findById(Long id, Long institutionId){
        Turma turma = turmaRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma", id));

        return turmaMapper.toResponse(turma);
    }

    @Transactional(readOnly = true)
    public List<TurmaResponse> findAll(Long institutionId){
        return turmaRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(turmaMapper::toResponse)
                .toList();
    }

    @Transactional
    public TurmaResponse update(Long id, TurmaRequest request, Long institutionId){
        Turma turma = turmaRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma", id));

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.SCHOOL, "update a turma");

        if (!turma.getName().equalsIgnoreCase(request.name()) &&
                turmaRepository.findByNameAndInstitutionId(request.name(), institutionId).isPresent()) {
            throw new DuplicateResourceException("Turma", "name", request.name());
        }

        Serie serie = serieRepository.findByIdAndInstitutionId(request.serieId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Serie", request.serieId()));

        turma.setName(request.name());
        turma.setShift(request.shift());
        turma.setExpectedStudents(request.expectedStudents());
        turma.setSerie(serie);
        turma.setYear(request.year());

        Turma updated = turmaRepository.save(turma);
        return turmaMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!turmaRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("Turma", id);
        }
        try {
            turmaRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Turma cannot be deleted because it is referenced by existing SubjectOffering records");
        }
    }
}
