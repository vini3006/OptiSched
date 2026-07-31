package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.ProfessorQualificationRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.dto.response.ProfessorQualificationResponse;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ProfessorQualificationMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorQualificationRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProfessorQualificationService {

    private final ProfessorQualificationRepository qualificationRepository;
    private final ProfessorRepository professorRepository;
    private final SubjectRepository subjectRepository;
    private final InstitutionRepository institutionRepository;
    private final ProfessorQualificationMapper qualificationMapper;
    private final Validator validator;

    public ProfessorQualificationService (ProfessorQualificationRepository qualificationRepository, ProfessorRepository professorRepository, SubjectRepository subjectRepository, InstitutionRepository institutionRepository, ProfessorQualificationMapper qualificationMapper, Validator validator){
        this.qualificationRepository = qualificationRepository;
        this.professorRepository = professorRepository;
        this.subjectRepository = subjectRepository;
        this.institutionRepository = institutionRepository;
        this.qualificationMapper = qualificationMapper;
        this.validator = validator;
    }

    @Transactional
    public ProfessorQualificationResponse create(ProfessorQualificationRequest request, Long institutionId){
        ProfessorQualificationId id = new ProfessorQualificationId(request.professorId(), request.subjectId());

        if(qualificationRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new DuplicateResourceException("ProfessorQualification already exists for professorId=" + request.professorId() + " and subjectId=" + request.subjectId());
        }

        Professor professor = professorRepository.findByIdAndInstitutionId(request.professorId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Professor", request.professorId()));

        Subject subject = subjectRepository.findByIdAndInstitutionId(request.subjectId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", request.subjectId()));

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        ProfessorQualification professorQualification = qualificationMapper.toEntity(professor, subject, institution);
        ProfessorQualification saved = qualificationRepository.save(professorQualification);
        return qualificationMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findAll(Long institutionId) {
        return qualificationRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findByProfessor(Long professorId, Long institutionId){
        if(!professorRepository.existsByIdAndInstitutionId(professorId, institutionId)) {
            throw new ResourceNotFoundException("Professor", professorId);
        }

        return qualificationRepository.findById_ProfessorIdAndInstitutionId(professorId, institutionId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findBySubject(Long subjectId, Long institutionId){
        if(!subjectRepository.existsByIdAndInstitutionId(subjectId, institutionId)){
            throw new ResourceNotFoundException("Subject", subjectId);
        }

        return qualificationRepository.findById_SubjectIdAndInstitutionId(subjectId, institutionId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfessorQualificationResponse> findByProfessorAndSubject(Long professorId, Long subjectId, Long institutionId){
        ProfessorQualificationId id = new ProfessorQualificationId(professorId, subjectId);

        if (!qualificationRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new ResourceNotFoundException(
                    "ProfessorQualification not found for professorId=" + professorId + " and subjectId=" + subjectId
            );
        }

        return qualificationRepository.findById_ProfessorIdAndId_SubjectIdAndInstitutionId(professorId, subjectId, institutionId)
                .stream()
                .map(qualificationMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long professorId, Long subjectId, Long institutionId) {
        ProfessorQualificationId id = new ProfessorQualificationId(professorId, subjectId);
        if (!qualificationRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new ResourceNotFoundException(
                    "ProfessorQualification not found for professorId=" + professorId + " and subjectId=" + subjectId
            );
        }
        qualificationRepository.deleteById(id);
    }

    /**
     * Imports qualifications from a CSV file, one row at a time, in its own
     * transaction each (this method is deliberately NOT @Transactional), so a
     * bad row never rolls back the rows already imported before it. Professors
     * and subjects are referenced by e-mail/code (human-readable) rather than
     * internal numeric IDs.
     */
    public ImportResultResponse importFromCsv(MultipartFile file, Long institutionId) {
        int total = 0;
        int success = 0;
        List<ImportRowError> errors = new ArrayList<>();

        try (CSVParser parser = CsvUtils.parse(file)) {
            for (CSVRecord record : parser) {
                total++;
                try {
                    String professorEmail = record.get("professorEmail");
                    String subjectCode = record.get("subjectCode");

                    Professor professor = professorRepository.findByUser_EmailAndInstitutionId(professorEmail, institutionId)
                            .orElseThrow(() -> new IllegalArgumentException("Professor with email '" + professorEmail + "' not found"));
                    Subject subject = subjectRepository.findByCodeAndInstitutionId(subjectCode, institutionId)
                            .orElseThrow(() -> new IllegalArgumentException("Subject with code '" + subjectCode + "' not found"));

                    ProfessorQualificationRequest request = new ProfessorQualificationRequest(professor.getId(), subject.getId());
                    CsvUtils.validate(validator, request);

                    create(request, institutionId);
                    success++;
                } catch (Exception e) {
                    errors.add(new ImportRowError(record.getRecordNumber(), e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read CSV file", e);
        }

        return new ImportResultResponse(total, success, errors);
    }

    @Transactional(readOnly = true)
    public byte[] exportToCsv(Long institutionId) {
        List<ProfessorQualification> qualifications = qualificationRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of("professorEmail", "subjectCode");
        List<List<String>> rows = qualifications.stream()
                .map(q -> List.of(q.getProfessor().getUser().getEmail(), q.getSubject().getCode()))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
