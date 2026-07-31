package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.mapper.SubjectMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubjectServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private SubjectRepository subjectRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SubjectService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new SubjectService(subjectRepository, institutionRepository, new SubjectMapper(), validator);
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "disciplinas.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void importFromCsv_validRows_allSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(subjectRepository.existsByCodeAndInstitutionId(anyString(), eq(INSTITUTION_ID))).thenReturn(false);
        when(subjectRepository.save(any(Subject.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "code,name,workload,requiredRoomType\n"
                + "CALC1,Cálculo I,4,\n"
                + "FIS1,Física I,4,LABORATORY\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importFromCsv_duplicateCode_reportsErrorButOtherRowsStillSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(subjectRepository.existsByCodeAndInstitutionId("CALC1", INSTITUTION_ID)).thenReturn(false);
        when(subjectRepository.existsByCodeAndInstitutionId("DUP1", INSTITUTION_ID)).thenReturn(true);
        when(subjectRepository.save(any(Subject.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "code,name,workload\n"
                + "CALC1,Cálculo I,4\n"
                + "DUP1,Duplicada,4\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("code");
    }

    @Test
    void importFromCsv_invalidRoomType_reportsClearErrorWithoutTouchingTheDatabase() {
        String content = "code,name,workload,requiredRoomType\n"
                + "CALC1,Cálculo I,4,NOT_A_ROOM_TYPE\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("NOT_A_ROOM_TYPE");
        verify(subjectRepository, never()).save(any());
    }

    @Test
    void importFromCsv_missingWorkload_reportsErrorWithoutTouchingTheDatabase() {
        String content = "code,name,workload\n"
                + "CALC1,Cálculo I,\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(subjectRepository, never()).save(any());
    }
}
