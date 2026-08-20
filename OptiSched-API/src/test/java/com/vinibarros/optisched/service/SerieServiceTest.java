package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SerieRequest;
import com.vinibarros.optisched.dto.response.SerieResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InstitutionTypeMismatchException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SerieMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
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
class SerieServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private SerieRepository serieRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SerieService service;

    @BeforeEach
    void setUp() {
        service = new SerieService(serieRepository, institutionRepository, new SerieMapper());
    }

    private Institution institution(InstitutionType type) {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        institution.setType(type);
        return institution;
    }

    private Serie serie(Long id, String name) {
        Serie serie = new Serie();
        serie.setId(id);
        serie.setName(name);
        serie.setOrder(9);
        return serie;
    }

    @Test
    void create_happyPath_persistsTheSerie() {
        SerieRequest request = new SerieRequest("9º Ano", 9);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(serieRepository.findByNameAndInstitutionId("9º Ano", INSTITUTION_ID)).thenReturn(Optional.empty());
        when(serieRepository.save(any(Serie.class))).thenAnswer(inv -> inv.getArgument(0));

        SerieResponse response = service.create(request, INSTITUTION_ID);

        assertThat(response.name()).isEqualTo("9º Ano");
        assertThat(response.order()).isEqualTo(9);
    }

    @Test
    void create_forUniversityInstitution_throwsInstitutionTypeMismatch() {
        SerieRequest request = new SerieRequest("9º Ano", 9);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(InstitutionTypeMismatchException.class);
    }

    @Test
    void create_duplicateName_throwsDuplicateResource() {
        SerieRequest request = new SerieRequest("9º Ano", 9);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(serieRepository.findByNameAndInstitutionId("9º Ano", INSTITUTION_ID)).thenReturn(Optional.of(serie(1L, "9º Ano")));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void findById_unknownSerie_throwsResourceNotFound() {
        when(serieRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_happyPath_updatesFields() {
        Serie existing = serie(1L, "9º Ano");
        SerieRequest request = new SerieRequest("9º Ano B", 10);

        when(serieRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(existing));
        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(serieRepository.findByNameAndInstitutionId("9º Ano B", INSTITUTION_ID)).thenReturn(Optional.empty());
        when(serieRepository.save(any(Serie.class))).thenAnswer(inv -> inv.getArgument(0));

        SerieResponse response = service.update(1L, request, INSTITUTION_ID);

        assertThat(response.name()).isEqualTo("9º Ano B");
        assertThat(response.order()).isEqualTo(10);
    }

    @Test
    void delete_removesTheSerie() {
        when(serieRepository.existsByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(true);

        service.delete(1L, INSTITUTION_ID);

        org.mockito.Mockito.verify(serieRepository).deleteById(1L);
    }
}
