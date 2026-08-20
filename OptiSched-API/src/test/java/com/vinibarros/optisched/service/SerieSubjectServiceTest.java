package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.SerieSubjectRequest;
import com.vinibarros.optisched.dto.response.SerieSubjectResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Serie;
import com.vinibarros.optisched.entity.SerieSubject;
import com.vinibarros.optisched.entity.SerieSubjectId;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InstitutionTypeMismatchException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.SerieSubjectMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.repository.SerieSubjectRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
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
class SerieSubjectServiceTest {

    private static final Long INSTITUTION_ID = 15L;
    private static final Long SERIE_ID = 1L;
    private static final Long SUBJECT_ID = 10L;

    @Mock private SerieSubjectRepository serieSubjectRepository;
    @Mock private SerieRepository serieRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private InstitutionRepository institutionRepository;

    private SerieSubjectService service;

    @BeforeEach
    void setUp() {
        service = new SerieSubjectService(serieSubjectRepository, serieRepository, subjectRepository, institutionRepository, new SerieSubjectMapper());
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
        serie.setName("9º Ano");
        return serie;
    }

    private Subject subject() {
        Subject subject = new Subject();
        subject.setId(SUBJECT_ID);
        subject.setCode("MAT9");
        subject.setName("Matemática");
        return subject;
    }

    @Test
    void create_happyPath_persistsTheSerieSubject() {
        SerieSubjectRequest request = new SerieSubjectRequest(SERIE_ID, SUBJECT_ID, 5);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(serieSubjectRepository.existsByIdAndInstitutionId(new SerieSubjectId(SERIE_ID, SUBJECT_ID), INSTITUTION_ID)).thenReturn(false);
        when(serieRepository.findByIdAndInstitutionId(SERIE_ID, INSTITUTION_ID)).thenReturn(Optional.of(serie()));
        when(subjectRepository.findByIdAndInstitutionId(SUBJECT_ID, INSTITUTION_ID)).thenReturn(Optional.of(subject()));
        when(serieSubjectRepository.save(any(SerieSubject.class))).thenAnswer(inv -> inv.getArgument(0));

        SerieSubjectResponse response = service.create(request, INSTITUTION_ID);

        assertThat(response.serieId()).isEqualTo(SERIE_ID);
        assertThat(response.subjectId()).isEqualTo(SUBJECT_ID);
        assertThat(response.weeklyWorkload()).isEqualTo(5);
    }

    @Test
    void create_forUniversityInstitution_throwsInstitutionTypeMismatch() {
        SerieSubjectRequest request = new SerieSubjectRequest(SERIE_ID, SUBJECT_ID, 5);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.UNIVERSITY)));

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(InstitutionTypeMismatchException.class);
    }

    @Test
    void create_duplicatePair_throwsDuplicateResource() {
        SerieSubjectRequest request = new SerieSubjectRequest(SERIE_ID, SUBJECT_ID, 5);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(institution(InstitutionType.SCHOOL)));
        when(serieSubjectRepository.existsByIdAndInstitutionId(new SerieSubjectId(SERIE_ID, SUBJECT_ID), INSTITUTION_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, INSTITUTION_ID))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void findBySerie_unknownSerie_throwsResourceNotFound() {
        when(serieRepository.existsByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(false);

        assertThatThrownBy(() -> service.findBySerie(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_unknownPair_throwsResourceNotFound() {
        when(serieSubjectRepository.existsByIdAndInstitutionId(new SerieSubjectId(SERIE_ID, SUBJECT_ID), INSTITUTION_ID)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(SERIE_ID, SUBJECT_ID, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_removesThePair() {
        when(serieSubjectRepository.existsByIdAndInstitutionId(new SerieSubjectId(SERIE_ID, SUBJECT_ID), INSTITUTION_ID)).thenReturn(true);

        service.delete(SERIE_ID, SUBJECT_ID, INSTITUTION_ID);

        org.mockito.Mockito.verify(serieSubjectRepository).deleteById(new SerieSubjectId(SERIE_ID, SUBJECT_ID));
    }
}
