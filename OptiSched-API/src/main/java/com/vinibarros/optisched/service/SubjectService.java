package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.SubjectRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.dto.response.SubjectResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.enums.RoomType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SubjectMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final InstitutionRepository institutionRepository;
    private final SubjectMapper subjectMapper;
    private final Validator validator;

    public SubjectService(SubjectRepository subjectRepository, InstitutionRepository institutionRepository, SubjectMapper subjectMapper, Validator validator) {
        this.subjectRepository = subjectRepository;
        this.institutionRepository = institutionRepository;
        this.subjectMapper = subjectMapper;
        this.validator = validator;
    }

    @Transactional
    public SubjectResponse create(SubjectRequest request, Long institutionId){
        if(subjectRepository.existsByCodeAndInstitutionId(request.code(), institutionId)){
            throw new DuplicateResourceException("Subject", "code", request.code());
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        Subject subject = subjectMapper.toEntity(request, institution);
        Subject saved = subjectRepository.save(subject);
        return subjectMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SubjectResponse findById(Long id, Long institutionId){
        Subject subject = subjectRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", id));
        return subjectMapper.toResponse(subject);
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> findAll(Long institutionId){
        return subjectRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(subjectMapper::toResponse)
                .toList();
    }

    @Transactional
    public SubjectResponse update(Long id, SubjectRequest request, Long institutionId){
        Subject subject = subjectRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", id));

        if (!subject.getCode().equals(request.code()) && subjectRepository.existsByCodeAndInstitutionId(request.code(), institutionId)) {
            throw new DuplicateResourceException("Subject", "code", request.code());
        }

        subject.setCode(request.code());
        subject.setName(request.name());
        subject.setWorkload(request.workload());
        subject.setRequiredRoomType(request.requiredRoomType());

        Subject updated = subjectRepository.save(subject);
        return subjectMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!subjectRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("Subject", id);
        }

        try {
            subjectRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Subject cannot be deleted because it is referenced by existing SubjectOffering or ProfessorQualification records");
        }
    }

    /**
     * Imports subjects from a CSV file, one row at a time, in its own
     * transaction each (this method is deliberately NOT @Transactional), so a
     * bad row never rolls back the rows already imported before it.
     */
    public ImportResultResponse importFromCsv(MultipartFile file, Long institutionId) {
        int total = 0;
        int success = 0;
        List<ImportRowError> errors = new ArrayList<>();

        try (CSVParser parser = CsvUtils.parse(file)) {
            for (CSVRecord record : parser) {
                total++;
                try {
                    String code = record.get("code");
                    String name = record.get("name");
                    Integer workload = CsvUtils.parseInt(record.get("workload"));
                    RoomType requiredRoomType = CsvUtils.parseEnumOrNull(RoomType.class, CsvUtils.getOptional(record, "requiredRoomType"));

                    SubjectRequest request = new SubjectRequest(code, name, workload, requiredRoomType);
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
        List<Subject> subjects = subjectRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of("code", "name", "workload", "requiredRoomType");
        List<List<String>> rows = subjects.stream()
                .map(s -> List.of(
                        s.getCode(),
                        s.getName(),
                        s.getWorkload().toString(),
                        s.getRequiredRoomType() != null ? s.getRequiredRoomType().name() : ""
                ))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
