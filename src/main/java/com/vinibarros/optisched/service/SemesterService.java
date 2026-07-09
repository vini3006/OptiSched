package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SemesterRequest;
import com.vinibarros.optisched.dto.response.SemesterResponse;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SemesterMapper;
import com.vinibarros.optisched.repository.SemesterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final SemesterMapper semesterMapper;

    public SemesterService(SemesterRepository semesterRepository, SemesterMapper semesterMapper) {
        this.semesterRepository = semesterRepository;
        this.semesterMapper = semesterMapper;
    }

    @Transactional
    public SemesterResponse create(SemesterRequest request) {
        if (semesterRepository.existsByYearAndTerm(request.year(), request.term())) {
            throw new DuplicateResourceException(
                    "Semester already exists for year " + request.year() + " and term " + request.term()
            );
        }

        Semester semester = semesterMapper.toEntity(request);
        Semester saved = semesterRepository.save(semester);
        return semesterMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SemesterResponse findById(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", id));
        return semesterMapper.toResponse(semester);
    }

    @Transactional(readOnly = true)
    public List<SemesterResponse> findAll() {
        return semesterRepository.findAll()
                .stream()
                .map(semesterMapper::toResponse)
                .toList();
    }

    @Transactional
    public SemesterResponse update(Long id, SemesterRequest request) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", id));

        boolean combinationChanged =
                !semester.getYear().equals(request.year()) || !semester.getTerm().equals(request.term());

        if (combinationChanged && semesterRepository.existsByYearAndTerm(request.year(), request.term())) {
            throw new DuplicateResourceException(
                    "Semester already exists for year " + request.year() + " and term " + request.term()
            );
        }

        semester.setYear(request.year());
        semester.setTerm(request.term());

        Semester updated = semesterRepository.save(semester);
        return semesterMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!semesterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Semester", id);
        }
        semesterRepository.deleteById(id);
    }
}
