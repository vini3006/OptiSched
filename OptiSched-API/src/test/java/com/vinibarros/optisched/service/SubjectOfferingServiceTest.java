package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SubjectOfferingRequest;
import com.vinibarros.optisched.dto.response.SubjectOfferingResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.entity.SubjectOffering;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InstitutionTypeMismatchException;
import com.vinibarros.optisched.mapper.SubjectOfferingMapper;
import com.vinibarros.optisched.repository.CourseRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import com.vinibarros.optisched.repository.SubjectOfferingRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubjectOfferingServiceTest {

    private static final Long INSTITUTION_ID = 15L;
    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Mock private SubjectOfferingRepository subjectOfferingRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private SemesterRepository semesterRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SubjectOfferingService service;

    @BeforeEach
    void setUp() {
        service = new SubjectOfferingService(
                subjectOfferingRepository, courseRepository, subjectRepository, semesterRepository,
                institutionRepository, new SubjectOfferingMapper(), VALIDATOR
        );
    }

    private Institution institution(InstitutionType type) {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        institution.setType(type);
        return institution;
    }

    private Course course(Long id, int totalSemesters) {
        Course course = new Course();
        course.setId(id);
        course.setName("Engenharia de Computação");
        course.setTotalSemesters(totalSemesters);
        return course;
    }

    private Subject subject(Long id) {
        Subject subject = new Subject();
        subject.setId(id);
        subject.setCode("CALC1");
        return subject;
    }

    private Semester semester(Long id) {
        Semester semester = new Semester();
        semester.setId(id);
        return semester;
    }

    // -------------------- request-level validation --------------------

    @Test
    void request_missingCourseId_isRejectedByValidation() {
        SubjectOfferingRequest request = new SubjectOfferingRequest(null, 10L, 100L, "A", 30, 1);

        Set<ConstraintViolation<SubjectOfferingRequest>> violations = VALIDATOR.validate(request);

        assertThat(violations).isNotEmpty();
    }

    @Test
    void request_missingSection_isRejectedByValidation() {
        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, null, 30, 1);

        Set<ConstraintViolation<SubjectOfferingRequest>> violations = VALIDATOR.validate(request);

        assertThat(violations).isNotEmpty();
    }

    // -------------------- create by course (university) --------------------

    @Test
    void create_viaCourseId_persistsOfferingWithCourse() {
        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, "A", 30, 1);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));
        when(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(1L, 10L, 100L, "A", INSTITUTION_ID)).thenReturn(false);
        when(courseRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(course(1L, 10)));
        when(subjectRepository.findByIdAndInstitutionId(10L, INSTITUTION_ID)).thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(semester(100L)));
        when(subjectOfferingRepository.save(any(SubjectOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        SubjectOfferingResponse response = service.create(request, INSTITUTION_ID);

        assertThat(response.courseId()).isEqualTo(1L);
        assertThat(response.turmaId()).isNull();
        assertThat(response.section()).isEqualTo("A");
    }

    @Test
    void create_viaCourseId_forSchoolInstitution_throwsInstitutionTypeMismatch() {
        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, "A", 30, 1);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(InstitutionTypeMismatchException.class);
    }

    @Test
    void create_duplicateCombination_throwsDuplicateResource() {
        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, "A", 30, 1);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));
        when(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(1L, 10L, 100L, "A", INSTITUTION_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(DuplicateResourceException.class);
    }

    // -------------------- validateRecommendedSemester --------------------

    @Test
    void validateRecommendedSemester_nullCourseAndNullSemester_doesNotThrow() {
        assertThatCode(() -> service.validateRecommendedSemester(null, null)).doesNotThrowAnyException();
    }

    @Test
    void validateRecommendedSemester_nullCourse_doesNotThrowEvenWithSemesterSet() {
        assertThatCode(() -> service.validateRecommendedSemester(3, null)).doesNotThrowAnyException();
    }

    @Test
    void validateRecommendedSemester_exceedsCourseTotalSemesters_throwsIllegalArgument() {
        assertThatThrownBy(() -> service.validateRecommendedSemester(5, course(1L, 2)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // -------------------- update --------------------

    @Test
    void update_happyPath_updatesFields() {
        Course existingCourse = course(1L, 10);
        Subject existingSubject = subject(10L);
        Semester existingSemester = semester(100L);

        SubjectOffering existing = new SubjectOffering();
        existing.setId(1L);
        existing.setCourse(existingCourse);
        existing.setSubject(existingSubject);
        existing.setSemester(existingSemester);
        existing.setSection("A");
        existing.setExpectedStudents(30);

        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, "B", 25, 1);

        when(subjectOfferingRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existing));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));
        when(courseRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existingCourse));
        when(subjectRepository.findByIdAndInstitutionId(10L, INSTITUTION_ID)).thenReturn(Optional.of(existingSubject));
        when(semesterRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(existingSemester));
        when(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(1L, 10L, 100L, "B", INSTITUTION_ID)).thenReturn(false);
        when(subjectOfferingRepository.save(any(SubjectOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        SubjectOfferingResponse response = service.update(1L, request, INSTITUTION_ID);

        assertThat(response.section()).isEqualTo("B");
        assertThat(response.expectedStudents()).isEqualTo(25);
    }

    @Test
    void update_forSchoolInstitution_throwsInstitutionTypeMismatch() {
        SubjectOffering existing = new SubjectOffering();
        existing.setId(1L);

        SubjectOfferingRequest request = new SubjectOfferingRequest(1L, 10L, 100L, "B", 25, 1);

        when(subjectOfferingRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existing));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));

        assertThatThrownBy(() -> service.update(1L, request, INSTITUTION_ID))
                .isInstanceOf(InstitutionTypeMismatchException.class);
    }
}
