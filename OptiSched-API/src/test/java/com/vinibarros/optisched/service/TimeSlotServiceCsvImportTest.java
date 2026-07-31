package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.TimeSlot;
import com.vinibarros.optisched.mapper.TimeSlotMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.TimeSlotRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeSlotServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private TimeSlotRepository timeSlotRepository;
    @Mock private InstitutionRepository institutionRepository;

    private TimeSlotService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new TimeSlotService(timeSlotRepository, institutionRepository, new TimeSlotMapper(), validator);
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "horarios.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void importFromCsv_validRows_allSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(timeSlotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndInstitutionId(
                any(), any(), any(), eq(INSTITUTION_ID))).thenReturn(false);
        when(timeSlotRepository.existsOverlappingTimeSlot(any(), any(), eq(INSTITUTION_ID))).thenReturn(false);
        when(timeSlotRepository.save(any(TimeSlot.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "dayOfWeek,startTime,endTime\n"
                + "MONDAY,07:50,08:40\n"
                + "TUESDAY,08:40,09:30\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importFromCsv_endTimeBeforeStartTime_reportsErrorWithoutTouchingTheDatabase() {
        String content = "dayOfWeek,startTime,endTime\n"
                + "MONDAY,08:40,07:50\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(timeSlotRepository, never()).save(any());
    }

    @Test
    void importFromCsv_duplicateTimeSlot_reportsErrorButOtherRowsStillSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(timeSlotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndInstitutionId(
                DayOfWeek.MONDAY, LocalTime.of(7, 50), LocalTime.of(8, 40), INSTITUTION_ID)).thenReturn(false);
        when(timeSlotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndInstitutionId(
                DayOfWeek.TUESDAY, LocalTime.of(8, 40), LocalTime.of(9, 30), INSTITUTION_ID)).thenReturn(true);
        when(timeSlotRepository.existsOverlappingTimeSlot(any(), any(), eq(INSTITUTION_ID))).thenReturn(false);
        when(timeSlotRepository.save(any(TimeSlot.class))).thenAnswer(inv -> inv.getArgument(0));

        String content = "dayOfWeek,startTime,endTime\n"
                + "MONDAY,07:50,08:40\n"
                + "TUESDAY,08:40,09:30\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
    }

    @Test
    void importFromCsv_invalidTimeFormat_reportsErrorWithoutTouchingTheDatabase() {
        String content = "dayOfWeek,startTime,endTime\n"
                + "MONDAY,not-a-time,08:40\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(timeSlotRepository, never()).save(any());
    }

    @Test
    void importFromCsv_invalidDayOfWeek_reportsErrorWithoutTouchingTheDatabase() {
        String content = "dayOfWeek,startTime,endTime\n"
                + "FUNDAY,07:50,08:40\n";

        ImportResultResponse result = service.importFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(timeSlotRepository, never()).save(any());
    }
}
