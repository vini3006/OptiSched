package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Classroom;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.mapper.ClassroomMapper;
import com.vinibarros.optisched.repository.ClassroomRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
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
class ClassroomServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private ClassroomRepository classroomRepository;
    @Mock private InstitutionRepository institutionRepository;

    private ClassroomService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new ClassroomService(classroomRepository, institutionRepository, new ClassroomMapper(), validator);
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "salas.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void importFromCsv_validRows_allSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(classroomRepository.existsByNumberAndInstitutionId(anyString(), eq(INSTITUTION_ID))).thenReturn(false);
        when(classroomRepository.save(any(Classroom.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "number,capacity,type\n"
                + "A-1,40,COMMON\n"
                + "Lab-1,25,LABORATORY\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importFromCsv_duplicateNumber_reportsErrorButOtherRowsStillSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(classroomRepository.existsByNumberAndInstitutionId("A-1", INSTITUTION_ID)).thenReturn(false);
        when(classroomRepository.existsByNumberAndInstitutionId("A-1-DUP", INSTITUTION_ID)).thenReturn(true);
        when(classroomRepository.save(any(Classroom.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "number,capacity,type\n"
                + "A-1,40,COMMON\n"
                + "A-1-DUP,40,COMMON\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("number");
    }

    @Test
    void importFromCsv_missingRequiredRoomType_reportsErrorWithoutTouchingTheDatabase() {
        String content = "number,capacity,type\n"
                + "A-1,40,\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(classroomRepository, never()).save(any());
    }

    @Test
    void importFromCsv_negativeCapacity_reportsValidationErrorWithoutTouchingTheDatabase() {
        String content = "number,capacity,type\n"
                + "A-1,-5,COMMON\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(classroomRepository, never()).save(any());
    }
}
