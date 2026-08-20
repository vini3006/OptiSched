package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.TurmaRequest;
import com.vinibarros.optisched.dto.response.TurmaResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.entity.Turma;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.PreferredShift;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InstitutionTypeMismatchException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.TurmaMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.repository.TurmaRepository;
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
class TurmaServiceTest {

    private static final Long INSTITUTION_ID = 15L;
    private static final Long SERIE_ID = 100L;
    private static final Integer YEAR = 2026;

    @Mock private TurmaRepository turmaRepository;
    @Mock private SerieRepository serieRepository;
    @Mock private InstitutionRepository institutionRepository;

    private TurmaService service;

    @BeforeEach
    void setUp() {
        service = new TurmaService(turmaRepository, serieRepository, institutionRepository, new TurmaMapper());
    }

    private Institution institution(InstitutionType type) {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        institution.setType(type);
        return institution;
    }

    private Serie serie() {
        Serie serie = new Serie();
        serie.setId(SERIE_ID);
        return serie;
    }

    private Turma turma(Long id, String name) {
        Turma turma = new Turma();
        turma.setId(id);
        turma.setName(name);
        turma.setShift(PreferredShift.MORNING);
        turma.setExpectedStudents(30);
        turma.setSerie(serie());
        turma.setYear(YEAR);
        return turma;
    }

    @Test
    void create_happyPath_persistsTheTurma() {
        TurmaRequest request = new TurmaRequest("9º Ano A", PreferredShift.MORNING, 30, SERIE_ID, YEAR);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(turmaRepository.findByNameAndInstitutionId("9º Ano A", INSTITUTION_ID)).thenReturn(Optional.empty());
        when(serieRepository.findByIdAndInstitutionId(SERIE_ID, INSTITUTION_ID)).thenReturn(Optional.of(serie()));
        when(turmaRepository.save(any(Turma.class))).thenAnswer(inv -> inv.getArgument(0));

        TurmaResponse response = service.create(request, INSTITUTION_ID);

        assertThat(response.name()).isEqualTo("9º Ano A");
        assertThat(response.serieId()).isEqualTo(SERIE_ID);
        assertThat(response.year()).isEqualTo(YEAR);
    }

    @Test
    void create_forUniversityInstitution_throwsInstitutionTypeMismatch() {
        TurmaRequest request = new TurmaRequest("9º Ano A", PreferredShift.MORNING, 30, SERIE_ID, YEAR);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(InstitutionTypeMismatchException.class);
    }

    @Test
    void create_duplicateName_throwsDuplicateResource() {
        TurmaRequest request = new TurmaRequest("9º Ano A", PreferredShift.MORNING, 30, SERIE_ID, YEAR);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(turmaRepository.findByNameAndInstitutionId("9º Ano A", INSTITUTION_ID)).thenReturn(Optional.of(turma(1L, "9º Ano A")));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void findById_unknownTurma_throwsResourceNotFound() {
        when(turmaRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_happyPath_updatesFields() {
        Turma existing = turma(1L, "9º Ano A");
        TurmaRequest request = new TurmaRequest("9º Ano B", PreferredShift.AFTERNOON, 25, SERIE_ID, YEAR);

        when(turmaRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existing));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(turmaRepository.findByNameAndInstitutionId("9º Ano B", INSTITUTION_ID)).thenReturn(Optional.empty());
        when(serieRepository.findByIdAndInstitutionId(SERIE_ID, INSTITUTION_ID)).thenReturn(Optional.of(serie()));
        when(turmaRepository.save(any(Turma.class))).thenAnswer(inv -> inv.getArgument(0));

        TurmaResponse response = service.update(1L, request, INSTITUTION_ID);

        assertThat(response.name()).isEqualTo("9º Ano B");
        assertThat(response.shift()).isEqualTo(PreferredShift.AFTERNOON);
        assertThat(response.expectedStudents()).isEqualTo(25);
    }

    @Test
    void delete_removesTheTurma() {
        when(turmaRepository.existsByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(true);

        service.delete(1L, INSTITUTION_ID);

        org.mockito.Mockito.verify(turmaRepository).deleteById(1L);
    }
}
