package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.ProfessorQualification;
import com.vinibarros.optisched.entity.ProfessorQualificationId;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.mapper.ProfessorQualificationMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorQualificationRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
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
class ProfessorQualificationServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private ProfessorQualificationRepository qualificationRepository;
    @Mock private ProfessorRepository professorRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private InstitutionRepository institutionRepository;

    private ProfessorQualificationService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new ProfessorQualificationService(
                qualificationRepository, professorRepository, subjectRepository, institutionRepository,
                new ProfessorQualificationMapper(), validator);
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "qualificacoes.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private Professor professor(long id, String email) {
        Professor professor = new Professor();
        professor.setId(id);
        User user = new User();
        user.setEmail(email);
        professor.setUser(user);
        return professor;
    }

    private Subject subject(long id, String code) {
        Subject subject = new Subject();
        subject.setId(id);
        subject.setCode(code);
        return subject;
    }

    @Test
    void importFromCsv_validRow_resolvesHumanReadableReferencesAndSucceeds() {
        Professor professor = professor(1L, "prof@cefet-teste.edu.br");
        Subject subject = subject(2L, "MAT101");

        when(professorRepository.findByUser_EmailAndInstitutionId("prof@cefet-teste.edu.br", INSTITUTION_ID))
                .thenReturn(Optional.of(professor));
        when(subjectRepository.findByCodeAndInstitutionId("MAT101", INSTITUTION_ID))
                .thenReturn(Optional.of(subject));
        when(qualificationRepository.existsByIdAndInstitutionId(any(ProfessorQualificationId.class), any()))
                .thenReturn(false);
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(subjectRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(subject));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(qualificationRepository.save(any(ProfessorQualification.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "professorEmail,subjectCode\n"
                + "prof@cefet-teste.edu.br,MAT101\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importFromCsv_unknownProfessorEmail_reportsClearErrorWithoutTouchingTheDatabase() {
        when(professorRepository.findByUser_EmailAndInstitutionId("ghost@cefet-teste.edu.br", INSTITUTION_ID))
                .thenReturn(Optional.empty());

        String content = "professorEmail,subjectCode\n"
                + "ghost@cefet-teste.edu.br,MAT101\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("ghost@cefet-teste.edu.br");
        verify(qualificationRepository, never()).save(any());
    }

    @Test
    void importFromCsv_unknownSubjectCode_reportsClearErrorWithoutTouchingTheDatabase() {
        Professor professor = professor(1L, "prof@cefet-teste.edu.br");
        when(professorRepository.findByUser_EmailAndInstitutionId("prof@cefet-teste.edu.br", INSTITUTION_ID))
                .thenReturn(Optional.of(professor));
        when(subjectRepository.findByCodeAndInstitutionId("GHOST", INSTITUTION_ID)).thenReturn(Optional.empty());

        String content = "professorEmail,subjectCode\n"
                + "prof@cefet-teste.edu.br,GHOST\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("GHOST");
        verify(qualificationRepository, never()).save(any());
    }

    @Test
    void importFromCsv_alreadyExistingQualification_reportsErrorButOtherRowsStillSucceed() {
        Professor professorA = professor(1L, "a@cefet-teste.edu.br");
        Professor professorB = professor(3L, "b@cefet-teste.edu.br");
        Subject subject = subject(2L, "MAT101");

        when(professorRepository.findByUser_EmailAndInstitutionId("a@cefet-teste.edu.br", INSTITUTION_ID))
                .thenReturn(Optional.of(professorA));
        when(professorRepository.findByUser_EmailAndInstitutionId("b@cefet-teste.edu.br", INSTITUTION_ID))
                .thenReturn(Optional.of(professorB));
        when(subjectRepository.findByCodeAndInstitutionId("MAT101", INSTITUTION_ID))
                .thenReturn(Optional.of(subject));
        when(qualificationRepository.existsByIdAndInstitutionId(new ProfessorQualificationId(1L, 2L), INSTITUTION_ID))
                .thenReturn(true);
        when(qualificationRepository.existsByIdAndInstitutionId(new ProfessorQualificationId(3L, 2L), INSTITUTION_ID))
                .thenReturn(false);
        when(professorRepository.findByIdAndInstitutionId(3L, INSTITUTION_ID)).thenReturn(Optional.of(professorB));
        when(subjectRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(subject));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(qualificationRepository.save(any(ProfessorQualification.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "professorEmail,subjectCode\n"
                + "a@cefet-teste.edu.br,MAT101\n"
                + "b@cefet-teste.edu.br,MAT101\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
    }
}
