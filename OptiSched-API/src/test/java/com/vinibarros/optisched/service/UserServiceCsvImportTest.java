package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.mapper.ProfessorMapper;
import com.vinibarros.optisched.mapper.UserMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.ScheduleEntryRepository;
import com.vinibarros.optisched.repository.UserRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers {@link UserService#importProfessorsFromCsv} — kept in its own file
 * rather than a general UserServiceTest since this session doesn't otherwise
 * have unit coverage for UserService yet.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceCsvImportTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private UserRepository userRepository;
    @Mock private InstitutionRepository institutionRepository;
    @Mock private ProfessorService professorService;
    @Mock private ProfessorRepository professorRepository;
    @Mock private ScheduleEntryRepository scheduleEntryRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        userService = new UserService(
                userRepository, institutionRepository, professorService, new UserMapper(), passwordEncoder, validator
        );
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "professores.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private Professor professor(Long id) {
        Professor professor = new Professor();
        professor.setId(id);
        return professor;
    }

    @Test
    void importProfessorsFromCsv_validRows_allSucceedAndHourCapsAreSetOnlyWhenPresent() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(professorService.create(any(), any(), any())).thenReturn(professor(10L));

        String content = "name,email,password,maxDailyTimeSlots,maxWeeklyTimeSlots\n"
                + "Ana Souza,ana@test.com,senha123,2,10\n"
                + "Bruno Lima,bruno@test.com,senha123,,\n";

        ImportResultResponse result = userService.importProfessorsFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();

        // Only the first row supplied hour caps — update() should be called exactly once.
        verify(professorService, org.mockito.Mockito.times(1)).update(eq(10L), any(), eq(INSTITUTION_ID));
    }

    @Test
    void importProfessorsFromCsv_duplicateEmail_reportsErrorButOtherRowsStillSucceed() {
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(new Institution()));
        when(userRepository.existsByEmail("ana@test.com")).thenReturn(false);
        when(userRepository.existsByEmail("duplicado@test.com")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(professorService.create(any(), any(), any())).thenReturn(professor(10L));

        String content = "name,email,password\n"
                + "Ana Souza,ana@test.com,senha123\n"
                + "Outro Nome,duplicado@test.com,senha123\n";

        ImportResultResponse result = userService.importProfessorsFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().getFirst().message()).contains("email");
    }

    @Test
    void importProfessorsFromCsv_missingRequiredField_reportsValidationErrorWithoutTouchingTheDatabase() {
        String content = "name,email,password\n"
                + ",ana@test.com,senha123\n";

        ImportResultResponse result = userService.importProfessorsFromCsv(csv(content), INSTITUTION_ID);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.successCount()).isEqualTo(0);
        assertThat(result.errors()).hasSize(1);
        verify(userRepository, never()).save(any());
    }
}
