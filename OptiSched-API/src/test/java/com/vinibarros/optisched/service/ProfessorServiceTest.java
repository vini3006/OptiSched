package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ProfessorRequest;
import com.vinibarros.optisched.dto.response.ProfessorResponse;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ProfessorMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.ScheduleEntryRepository;
import com.vinibarros.optisched.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfessorServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private ProfessorRepository professorRepository;
    @Mock private InstitutionRepository institutionRepository;
    @Mock private UserRepository userRepository;
    @Mock private ScheduleEntryRepository scheduleEntryRepository;

    private ProfessorService service;

    @BeforeEach
    void setUp() {
        service = new ProfessorService(
                professorRepository, institutionRepository, new ProfessorMapper(),
                userRepository, scheduleEntryRepository
        );
    }

    private Professor professor(Long id, String name) {
        Professor professor = new Professor();
        professor.setId(id);
        professor.setName(name);
        return professor;
    }

    @Test
    void update_setsNameAndHourCaps() {
        Professor professor = professor(1L, "Ana");
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(professorRepository.save(any(Professor.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfessorResponse response = service.update(1L, new ProfessorRequest("Ana Souza", 2, 10), INSTITUTION_ID);

        assertThat(response.name()).isEqualTo("Ana Souza");
        assertThat(response.maxDailyTimeSlots()).isEqualTo(2);
        assertThat(response.maxWeeklyTimeSlots()).isEqualTo(10);
    }

    @Test
    void update_withNullCaps_clearsAnyPreviouslySetCap() {
        Professor professor = professor(1L, "Ana");
        professor.setMaxDailyTimeSlots(2);
        professor.setMaxWeeklyTimeSlots(10);
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(professorRepository.save(any(Professor.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfessorResponse response = service.update(1L, new ProfessorRequest("Ana", null, null), INSTITUTION_ID);

        assertThat(response.maxDailyTimeSlots()).isNull();
        assertThat(response.maxWeeklyTimeSlots()).isNull();
    }

    @Test
    void update_unknownProfessor_throwsResourceNotFound() {
        when(professorRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, new ProfessorRequest("Ana", null, null), INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
