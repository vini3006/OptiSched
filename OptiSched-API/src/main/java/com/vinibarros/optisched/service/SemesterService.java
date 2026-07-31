package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SemesterRequest;
import com.vinibarros.optisched.dto.response.SemesterResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InvalidSemesterException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SemesterMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final InstitutionRepository institutionRepository;
    private final SemesterMapper semesterMapper;

    public SemesterService(SemesterRepository semesterRepository, InstitutionRepository institutionRepository, SemesterMapper semesterMapper) {
        this.semesterRepository = semesterRepository;
        this.institutionRepository = institutionRepository;
        this.semesterMapper = semesterMapper;
    }

    @Transactional
    public SemesterResponse create(SemesterRequest request, Long institutionId) {
        if (semesterRepository.existsByYearAndTermAndInstitutionId(request.year(), request.term(), institutionId)) {
            throw new DuplicateResourceException(
                    "Semester already exists for year " + request.year() + " and term " + request.term()
            );
        }

        validateDateRange(request);

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        Semester semester = semesterMapper.toEntity(request, institution);
        Semester saved = semesterRepository.save(semester);
        return semesterMapper.toResponse(saved);
    }

    private void validateDateRange(SemesterRequest request) {
        if (request.startDate() != null && request.endDate() != null && !request.endDate().isAfter(request.startDate())) {
            throw new InvalidSemesterException("The semester's end date must be after its start date.");
        }
    }

    @Transactional(readOnly = true)
    public SemesterResponse findById(Long id, Long institutionId) {
        Semester semester = semesterRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", id));
        return semesterMapper.toResponse(semester);
    }

    @Transactional(readOnly = true)
    public List<SemesterResponse> findAll(Long institutionId) {
        return semesterRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(semesterMapper::toResponse)
                .toList();
    }

    @Transactional
    public SemesterResponse update(Long id, SemesterRequest request, Long institutionId) {
        Semester semester = semesterRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", id));

        boolean combinationChanged =
                !semester.getYear().equals(request.year()) || !semester.getTerm().equals(request.term());

        if (combinationChanged && semesterRepository.existsByYearAndTermAndInstitutionId(request.year(), request.term(), institutionId)) {
            throw new DuplicateResourceException(
                    "Semester already exists for year " + request.year() + " and term " + request.term()
            );
        }

        validateDateRange(request);

        semester.setYear(request.year());
        semester.setTerm(request.term());
        semester.setStartDate(request.startDate());
        semester.setEndDate(request.endDate());

        Semester updated = semesterRepository.save(semester);
        return semesterMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId) {
        if (!semesterRepository.existsByIdAndInstitutionId(id, institutionId)) {
            throw new ResourceNotFoundException("Semester", id);
        }
        try {
            semesterRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Semester cannot be deleted because it is referenced by existing SubjectOffering or Schedule records");
        }
    }
}
