package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SerieSubjectRequest;
import com.vinibarros.optisched.dto.response.SerieSubjectResponse;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SerieSubjectMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.repository.SerieSubjectRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import com.vinibarros.optisched.util.InstitutionTypeUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SerieSubjectService {

    private final SerieSubjectRepository serieSubjectRepository;
    private final SerieRepository serieRepository;
    private final SubjectRepository subjectRepository;
    private final InstitutionRepository institutionRepository;
    private final SerieSubjectMapper serieSubjectMapper;

    public SerieSubjectService(SerieSubjectRepository serieSubjectRepository, SerieRepository serieRepository, SubjectRepository subjectRepository, InstitutionRepository institutionRepository, SerieSubjectMapper serieSubjectMapper){
        this.serieSubjectRepository = serieSubjectRepository;
        this.serieRepository = serieRepository;
        this.subjectRepository = subjectRepository;
        this.institutionRepository = institutionRepository;
        this.serieSubjectMapper = serieSubjectMapper;
    }

    @Transactional
    public SerieSubjectResponse create(SerieSubjectRequest request, Long institutionId){
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.SCHOOL, "add a subject to a serie's curriculum");

        SerieSubjectId id = new SerieSubjectId(request.serieId(), request.subjectId());
        if(serieSubjectRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new DuplicateResourceException("SerieSubject already exists for serieId=" + request.serieId() + " and subjectId=" + request.subjectId());
        }

        Serie serie = serieRepository.findByIdAndInstitutionId(request.serieId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Serie", request.serieId()));
        Subject subject = subjectRepository.findByIdAndInstitutionId(request.subjectId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", request.subjectId()));

        SerieSubject serieSubject = serieSubjectMapper.toEntity(serie, subject, request.weeklyWorkload(), institution);
        SerieSubject saved = serieSubjectRepository.save(serieSubject);
        return serieSubjectMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SerieSubjectResponse> findAll(Long institutionId) {
        return serieSubjectRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(serieSubjectMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SerieSubjectResponse> findBySerie(Long serieId, Long institutionId){
        if(!serieRepository.existsByIdAndInstitutionId(serieId, institutionId)) {
            throw new ResourceNotFoundException("Serie", serieId);
        }

        return serieSubjectRepository.findById_SerieIdAndInstitutionId(serieId, institutionId)
                .stream()
                .map(serieSubjectMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SerieSubjectResponse> findBySubject(Long subjectId, Long institutionId){
        if(!subjectRepository.existsByIdAndInstitutionId(subjectId, institutionId)){
            throw new ResourceNotFoundException("Subject", subjectId);
        }

        return serieSubjectRepository.findById_SubjectIdAndInstitutionId(subjectId, institutionId)
                .stream()
                .map(serieSubjectMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long serieId, Long subjectId, Long institutionId) {
        SerieSubjectId id = new SerieSubjectId(serieId, subjectId);
        if (!serieSubjectRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new ResourceNotFoundException(
                    "SerieSubject not found for serieId=" + serieId + " and subjectId=" + subjectId
            );
        }
        serieSubjectRepository.deleteById(id);
    }
}
