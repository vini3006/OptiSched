package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.entity.SubjectOffering;
import com.vinibarros.optisched.enums.Term;
import com.vinibarros.optisched.mapper.SubjectOfferingMapper;
import com.vinibarros.optisched.repository.CourseRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import com.vinibarros.optisched.repository.SubjectOfferingRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubjectOfferingServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private SubjectOfferingRepository subjectOfferingRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private SemesterRepository semesterRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SubjectOfferingService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new SubjectOfferingService(
                subjectOfferingRepository, courseRepository, subjectRepository, semesterRepository,
                institutionRepository, new SubjectOfferingMapper(), validator
        );
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "ofertas.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
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
        semester.setYear(2026);
        semester.setTerm(Term.SECOND);
        return semester;
    }

    @Test
    void importFromCsv_validRow_resolvesHumanReadableReferencesAndSucceeds() {
        when(courseRepository.findByNameAndInstitutionId("Engenharia de Computação", INSTITUTION_ID))
                .thenReturn(Optional.of(course(1L, 10)));
        when(subjectRepository.findByCodeAndInstitutionId("CALC1", INSTITUTION_ID))
                .thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByYearAndTermAndInstitutionId(2026, Term.SECOND, INSTITUTION_ID))
                .thenReturn(Optional.of(semester(100L)));
        // create(...) re-resolves everything by ID internally (it's the same
        // method the single-record endpoint uses) — the by-name/by-code
        // lookups above only exist to translate the CSV's human-readable
        // columns into these IDs.
        when(courseRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(course(1L, 10)));
        when(subjectRepository.findByIdAndInstitutionId(10L, INSTITUTION_ID)).thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(semester(100L)));
        when(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(
                1L, 10L, 100L, "A", INSTITUTION_ID)).thenReturn(false);
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(subjectOfferingRepository.save(any(SubjectOffering.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "courseName,subjectCode,semesterYear,semesterTerm,section,expectedStudents,recommendedSemester\n"
                + "Engenharia de Computação,CALC1,2026,SECOND,A,30,1\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importFromCsv_unknownCourseName_reportsClearErrorWithoutTouchingTheDatabase() {
        when(courseRepository.findByNameAndInstitutionId("Curso Inexistente", INSTITUTION_ID))
                .thenReturn(Optional.empty());

        String content = "courseName,subjectCode,semesterYear,semesterTerm,section,expectedStudents,recommendedSemester\n"
                + "Curso Inexistente,CALC1,2026,SECOND,A,30,1\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("Curso Inexistente");
        verify(subjectOfferingRepository, never()).save(any());
    }

    @Test
    void importFromCsv_unknownSemester_reportsClearErrorWithoutTouchingTheDatabase() {
        when(courseRepository.findByNameAndInstitutionId("Engenharia de Computação", INSTITUTION_ID))
                .thenReturn(Optional.of(course(1L, 10)));
        when(subjectRepository.findByCodeAndInstitutionId("CALC1", INSTITUTION_ID))
                .thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByYearAndTermAndInstitutionId(2099, Term.FIRST, INSTITUTION_ID))
                .thenReturn(Optional.empty());

        String content = "courseName,subjectCode,semesterYear,semesterTerm,section,expectedStudents,recommendedSemester\n"
                + "Engenharia de Computação,CALC1,2099,FIRST,A,30,1\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("2099");
        verify(subjectOfferingRepository, never()).save(any());
    }

    @Test
    void importFromCsv_recommendedSemesterExceedsCourseTotalSemesters_reportsErrorWithoutTouchingTheDatabase() {
        when(courseRepository.findByNameAndInstitutionId("Engenharia de Computação", INSTITUTION_ID))
                .thenReturn(Optional.of(course(1L, 2)));
        when(subjectRepository.findByCodeAndInstitutionId("CALC1", INSTITUTION_ID))
                .thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByYearAndTermAndInstitutionId(2026, Term.SECOND, INSTITUTION_ID))
                .thenReturn(Optional.of(semester(100L)));
        when(courseRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(course(1L, 2)));
        when(subjectRepository.findByIdAndInstitutionId(10L, INSTITUTION_ID)).thenReturn(Optional.of(subject(10L)));
        when(semesterRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(semester(100L)));
        when(subjectOfferingRepository.existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(
                1L, 10L, 100L, "A", INSTITUTION_ID)).thenReturn(false);
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));

        String content = "courseName,subjectCode,semesterYear,semesterTerm,section,expectedStudents,recommendedSemester\n"
                + "Engenharia de Computação,CALC1,2026,SECOND,A,30,9\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(subjectOfferingRepository, never()).save(any());
    }
}
