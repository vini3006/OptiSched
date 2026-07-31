package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SemesterRequest;
import com.vinibarros.optisched.dto.response.SemesterResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.enums.Term;
import com.vinibarros.optisched.exception.InvalidSemesterException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SemesterMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SemesterServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private SemesterRepository semesterRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SemesterService service;

    @BeforeEach
    void setUp() {
        service = new SemesterService(semesterRepository, institutionRepository, new SemesterMapper());
    }

    private Institution institution() {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        return institution;
    }

    private Semester semester(Long id, Integer year, Term term) {
        Semester semester = new Semester();
        semester.setId(id);
        semester.setYear(year);
        semester.setTerm(term);
        return semester;
    }

    @Test
    void create_withValidDateRange_savesSemester() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));
        when(semesterRepository.save(any(Semester.class))).thenAnswer(inv -> inv.getArgument(0));

        SemesterResponse response = service.create(
                new SemesterRequest(2026, Term.SECOND, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 12, 15)),
                INSTITUTION_ID
        );

        assertThat(response.startDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(response.endDate()).isEqualTo(LocalDate.of(2026, 12, 15));
    }

    @Test
    void create_withNullDates_isAllowed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution()));
        when(semesterRepository.save(any(Semester.class))).thenAnswer(inv -> inv.getArgument(0));

        SemesterResponse response = service.create(
                new SemesterRequest(2026, Term.SECOND, null, null),
                INSTITUTION_ID
        );

        assertThat(response.startDate()).isNull();
        assertThat(response.endDate()).isNull();
    }

    @Test
    void create_withEndDateBeforeStartDate_throwsInvalidSemester() {
        assertThatThrownBy(() -> service.create(
                new SemesterRequest(2026, Term.SECOND, LocalDate.of(2026, 12, 15), LocalDate.of(2026, 8, 1)),
                INSTITUTION_ID
        )).isInstanceOf(InvalidSemesterException.class);
    }

    @Test
    void create_withEndDateEqualToStartDate_throwsInvalidSemester() {
        LocalDate sameDay = LocalDate.of(2026, 8, 1);

        assertThatThrownBy(() -> service.create(
                new SemesterRequest(2026, Term.SECOND, sameDay, sameDay),
                INSTITUTION_ID
        )).isInstanceOf(InvalidSemesterException.class);
    }

    @Test
    void update_withEndDateBeforeStartDate_throwsInvalidSemesterAndDoesNotSave() {
        Semester existing = semester(1L, 2026, Term.SECOND);
        when(semesterRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.update(
                1L,
                new SemesterRequest(2026, Term.SECOND, LocalDate.of(2026, 12, 15), LocalDate.of(2026, 8, 1)),
                INSTITUTION_ID
        )).isInstanceOf(InvalidSemesterException.class);
    }

    @Test
    void update_unknownSemester_throwsResourceNotFound() {
        when(semesterRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(
                99L, new SemesterRequest(2026, Term.SECOND, null, null), INSTITUTION_ID
        )).isInstanceOf(ResourceNotFoundException.class);
    }
}
