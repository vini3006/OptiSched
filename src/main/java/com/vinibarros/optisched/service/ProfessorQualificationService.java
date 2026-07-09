package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ProfessorQualificationRequest;
import com.vinibarros.optisched.dto.response.ProfessorQualificationResponse;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.ProfessorQualification;
import com.vinibarros.optisched.entity.ProfessorQualificationId;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ProfessorQualificationMapper;
import com.vinibarros.optisched.repository.ProfessorQualificationRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProfessorQualificationService {

    private final ProfessorQualificationRepository qualificationRepository;
    private final ProfessorRepository professorRepository;
    private final SubjectRepository subjectRepository;
    private final ProfessorQualificationMapper qualificationMapper;

    public ProfessorQualificationService (ProfessorQualificationRepository qualificationRepository, ProfessorRepository professorRepository, SubjectRepository subjectRepository, ProfessorQualificationMapper qualificationMapper){
        this.qualificationRepository = qualificationRepository;
        this.professorRepository = professorRepository;
        this.subjectRepository = subjectRepository;
        this.qualificationMapper = qualificationMapper;
    }

    @Transactional
    public ProfessorQualificationResponse create(ProfessorQualificationRequest request){
        ProfessorQualificationId id = new ProfessorQualificationId(request.professorId(), request.subjectId());

        if(qualificationRepository.existsById(id)) {
            throw new DuplicateResourceException("ProfessorQualification already exists for professorId=" + request.professorId() + " and subjectId=" + request.subjectId());
        }

        Professor professor = professorRepository.findById(request.professorId())
                .orElseThrow(() -> new ResourceNotFoundException("Professor", request.professorId()));

        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject", request.subjectId()));

        ProfessorQualification professorQualification = qualificationMapper.toEntity(professor, subject);
        ProfessorQualification saved = qualificationRepository.save(professorQualification);
        return qualificationMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findAll() {
        return qualificationRepository.findAll()
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findByProfessor(Long professorId){
        if(!professorRepository.existsById(professorId)) {
            throw new ResourceNotFoundException("Professor", professorId);
        }

        return qualificationRepository.findByIdProfessorId(professorId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findBySubject(Long subjectId){
        if(!subjectRepository.existsById(subjectId)){
            throw new ResourceNotFoundException("Subject", subjectId);
        }

        return qualificationRepository.findByIdSubjectId(subjectId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long professorId, Long subjectId) {
        ProfessorQualificationId id = new ProfessorQualificationId(professorId, subjectId);
        if (!qualificationRepository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "ProfessorQualification not found for professorId=" + professorId + " and subjectId=" + subjectId
            );
        }
        qualificationRepository.deleteById(id);
    }
}
