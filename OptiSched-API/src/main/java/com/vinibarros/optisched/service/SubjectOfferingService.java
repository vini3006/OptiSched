package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.SubjectOfferingRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.dto.response.SubjectOfferingResponse;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.Term;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SubjectOfferingMapper;
import com.vinibarros.optisched.repository.*;
import com.vinibarros.optisched.util.InstitutionTypeUtils;
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
import java.util.Objects;

@Service
public class SubjectOfferingService {

    private final SubjectOfferingRepository subjectOfferingRepository;
    private final CourseRepository courseRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final InstitutionRepository institutionRepository;
    private final SubjectOfferingMapper subjectOfferingMapper;
    private final Validator validator;

    public SubjectOfferingService(SubjectOfferingRepository subjectOfferingRepository, CourseRepository courseRepository, SubjectRepository subjectRepository, SemesterRepository semesterRepository, InstitutionRepository institutionRepository, SubjectOfferingMapper subjectOfferingMapper, Validator validator){
        this.subjectOfferingRepository = subjectOfferingRepository;
        this.courseRepository = courseRepository;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
        this.institutionRepository = institutionRepository;
        this.subjectOfferingMapper = subjectOfferingMapper;
        this.validator = validator;
    }

    @Transactional
    public SubjectOfferingResponse create(SubjectOfferingRequest request, Long institutionId){
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.UNIVERSITY, "create a subject offering");

        if(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(request.courseId(), request.subjectId(), request.semesterId(), request.section(), institutionId)){
            throw new DuplicateResourceException("SubjectOffering already exists with these attributes.");
        }

        Course course = courseRepository.findByIdAndInstitutionId(request.courseId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", request.courseId()));
        Subject subject = subjectRepository.findByIdAndInstitutionId(request.subjectId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", request.subjectId()));
        Semester semester = semesterRepository.findByIdAndInstitutionId(request.semesterId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", request.semesterId()));

        validateRecommendedSemester(request.recommendedSemester(), course);

        SubjectOffering subjectOffering = subjectOfferingMapper.toEntity(request, course, subject, semester, institution);
        SubjectOffering saved = subjectOfferingRepository.save(subjectOffering);
        return subjectOfferingMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SubjectOfferingResponse findById(Long id, Long institutionId){
        SubjectOffering subjectOffering = subjectOfferingRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("SubjectOffering", id));
        return subjectOfferingMapper.toResponse(subjectOffering);
    }

    @Transactional(readOnly = true)
    public List<SubjectOfferingResponse> findAll(Long institutionId){
        return subjectOfferingRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(subjectOfferingMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectOfferingResponse> findByCourse(Long courseId, Long institutionId){
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.UNIVERSITY, "list subject offerings by course");

        if(!courseRepository.existsByIdAndInstitutionId(courseId, institutionId)){
            throw new ResourceNotFoundException("Course", courseId);
        }
        return subjectOfferingRepository.findByCourseId(courseId)
                .stream()
                .map(subjectOfferingMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectOfferingResponse> findBySubject(Long subjectId, Long institutionId){
        if(!subjectRepository.existsByIdAndInstitutionId(subjectId, institutionId)){
            throw new ResourceNotFoundException("Subject", subjectId);
        }
        return subjectOfferingRepository.findBySubjectId(subjectId)
                .stream()
                .map(subjectOfferingMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectOfferingResponse> findBySemester(Long semesterId, Long institutionId){
        if(!semesterRepository.existsByIdAndInstitutionId(semesterId, institutionId)){
            throw new ResourceNotFoundException("Semester", semesterId);
        }
        return subjectOfferingRepository.findBySemesterId(semesterId)
                .stream()
                .map(subjectOfferingMapper::toResponse)
                .toList();
    }

    @Transactional
    public SubjectOfferingResponse update(Long id, SubjectOfferingRequest request, Long institutionId){
        SubjectOffering subjectOffering = subjectOfferingRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("SubjectOffering", id));

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.UNIVERSITY, "update a subject offering");

        Course course = courseRepository.findByIdAndInstitutionId(request.courseId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", request.courseId()));
        Subject subject = subjectRepository.findByIdAndInstitutionId(request.subjectId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", request.subjectId()));
        Semester semester = semesterRepository.findByIdAndInstitutionId(request.semesterId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Semester", request.semesterId()));

        validateRecommendedSemester(request.recommendedSemester(), course);

        Long currentCourseId = subjectOffering.getCourse() != null ? subjectOffering.getCourse().getId() : null;
        boolean combinationChanged =
                !Objects.equals(currentCourseId, request.courseId()) ||
                        !subjectOffering.getSubject().getId().equals(request.subjectId()) ||
                        !subjectOffering.getSemester().getId().equals(request.semesterId()) ||
                        !Objects.equals(subjectOffering.getSection(), request.section());

        if(combinationChanged && subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId
                (request.courseId(), request.subjectId(), request.semesterId(), request.section(), institutionId)) {
            throw new DuplicateResourceException("SubjectOffering already exists for this course, subject, semester and section combination");
        }

        subjectOffering.setCourse(course);
        subjectOffering.setSubject(subject);
        subjectOffering.setSemester(semester);
        subjectOffering.setSection(request.section());
        subjectOffering.setExpectedStudents(request.expectedStudents());
        subjectOffering.setRecommendedSemester(request.recommendedSemester());

        SubjectOffering updated = subjectOfferingRepository.save(subjectOffering);
        return subjectOfferingMapper.toResponse(updated);
    }

    void validateRecommendedSemester(Integer recommendedSemester, Course course){
        if (course == null || recommendedSemester == null) return;
        if(recommendedSemester > course.getTotalSemesters()){
            throw new IllegalArgumentException(
                    "recommendedSemester (" + recommendedSemester + ") cannot exceed course \""
                            + course.getName() + "\"'s totalSemesters (" + course.getTotalSemesters() + ")"
            );
        }
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!subjectOfferingRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("SubjectOffering", id);
        }
        try {
            subjectOfferingRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("SubjectOffering cannot be deleted because it is referenced by existing ScheduleEntry records");
        }
    }

    /**
     * Imports subject offerings from a CSV file, one row at a time, in its
     * own transaction each (this method is deliberately NOT @Transactional),
     * so a bad row never rolls back the rows already imported before it.
     * Course/Subject/Semester are referenced by human-readable identifiers
     * (name/code/year+term) rather than internal database IDs, since those
     * IDs aren't something an Admin filling out a spreadsheet would know.
     */
    public ImportResultResponse importFromCsv(MultipartFile file, Long institutionId) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.UNIVERSITY, "import subject offerings by course");

        int total = 0;
        int success = 0;
        List<ImportRowError> errors = new ArrayList<>();

        try (CSVParser parser = CsvUtils.parse(file)) {
            for (CSVRecord record : parser) {
                total++;
                try {
                    String courseName = record.get("courseName");
                    String subjectCode = record.get("subjectCode");
                    Integer semesterYear = CsvUtils.parseInt(record.get("semesterYear"));
                    Term semesterTerm = CsvUtils.parseEnum(Term.class, record.get("semesterTerm"));
                    String section = record.get("section");
                    Integer expectedStudents = CsvUtils.parseInt(record.get("expectedStudents"));
                    Integer recommendedSemester = CsvUtils.parseInt(record.get("recommendedSemester"));

                    Course course = courseRepository.findByNameAndInstitutionId(courseName, institutionId)
                            .orElseThrow(() -> new IllegalArgumentException("Course '" + courseName + "' not found"));
                    Subject subject = subjectRepository.findByCodeAndInstitutionId(subjectCode, institutionId)
                            .orElseThrow(() -> new IllegalArgumentException("Subject with code '" + subjectCode + "' not found"));
                    Semester semester = semesterRepository.findByYearAndTermAndInstitutionId(semesterYear, semesterTerm, institutionId)
                            .orElseThrow(() -> new IllegalArgumentException("Semester " + semesterYear + "/" + semesterTerm + " not found"));

                    SubjectOfferingRequest request = new SubjectOfferingRequest(
                            course.getId(), subject.getId(), semester.getId(), section, expectedStudents, recommendedSemester
                    );
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
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));
        InstitutionTypeUtils.requireType(institution, InstitutionType.UNIVERSITY, "export subject offerings by course");

        List<SubjectOffering> offerings = subjectOfferingRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of(
                "courseName", "subjectCode", "semesterYear", "semesterTerm",
                "section", "expectedStudents", "recommendedSemester"
        );
        List<List<String>> rows = offerings.stream()
                .map(o -> List.of(
                        o.getCourse().getName(),
                        o.getSubject().getCode(),
                        o.getSemester().getYear().toString(),
                        o.getSemester().getTerm().name(),
                        o.getSection(),
                        o.getExpectedStudents().toString(),
                        o.getRecommendedSemester() != null ? o.getRecommendedSemester().toString() : ""
                ))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
