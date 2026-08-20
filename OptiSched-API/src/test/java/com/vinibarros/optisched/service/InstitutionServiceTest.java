package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.InstitutionRequest;
import com.vinibarros.optisched.dto.response.InstitutionResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import com.vinibarros.optisched.mapper.InstitutionMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InstitutionServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private InstitutionRepository institutionRepository;

    private InstitutionService service;

    @BeforeEach
    void setUp() {
        service = new InstitutionService(institutionRepository, new InstitutionMapper());
    }

    private Institution institution(Long id, String name, String cnpj, InstitutionType type) {
        Institution institution = new Institution();
        institution.setId(id);
        institution.setName(name);
        institution.setCnpj(cnpj);
        institution.setSubscriptionStatus(SubscriptionStatus.TRIAL);
        institution.setType(type);
        return institution;
    }

    @Test
    void create_withTypeSchool_persistsSchoolType() {
        InstitutionRequest request = new InstitutionRequest("Escola Modelo", "12345678901234", SubscriptionStatus.TRIAL, null, InstitutionType.SCHOOL);

        when(institutionRepository.existsByName("Escola Modelo")).thenReturn(false);
        when(institutionRepository.existsByCnpj("12345678901234")).thenReturn(false);
        when(institutionRepository.save(any(Institution.class))).thenAnswer(inv -> inv.getArgument(0));

        InstitutionResponse response = service.create(request);

        assertThat(response.type()).isEqualTo(InstitutionType.SCHOOL);
    }

    @Test
    void create_withTypeUniversity_persistsUniversityType() {
        InstitutionRequest request = new InstitutionRequest("Universidade Modelo", "98765432109876", SubscriptionStatus.TRIAL, null, InstitutionType.UNIVERSITY);

        when(institutionRepository.existsByName("Universidade Modelo")).thenReturn(false);
        when(institutionRepository.existsByCnpj("98765432109876")).thenReturn(false);
        when(institutionRepository.save(any(Institution.class))).thenAnswer(inv -> inv.getArgument(0));

        InstitutionResponse response = service.create(request);

        assertThat(response.type()).isEqualTo(InstitutionType.UNIVERSITY);
    }

    @Test
    void update_withDifferentTypeInRequest_doesNotChangeThePersistedType() {
        Institution existing = institution(INSTITUTION_ID, "Escola Modelo", "12345678901234", InstitutionType.SCHOOL);
        // Request carries UNIVERSITY, but type must stay immutable after creation.
        InstitutionRequest request = new InstitutionRequest("Escola Modelo", "12345678901234", SubscriptionStatus.ACTIVE, null, InstitutionType.UNIVERSITY);

        when(institutionRepository.findById(INSTITUTION_ID)).thenReturn(Optional.of(existing));
        when(institutionRepository.save(any(Institution.class))).thenAnswer(inv -> inv.getArgument(0));

        InstitutionResponse response = service.update(INSTITUTION_ID, request);

        assertThat(response.type()).isEqualTo(InstitutionType.SCHOOL);
        assertThat(response.subscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }
}
