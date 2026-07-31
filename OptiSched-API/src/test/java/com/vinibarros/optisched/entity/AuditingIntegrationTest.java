package com.vinibarros.optisched.entity;

import com.vinibarros.optisched.enums.SubscriptionStatus;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves @EnableJpaAuditing (config/JpaAuditingConfig) actually wires
 * createdAt/updatedAt on entities extending Auditable, rather than just
 * compiling — a mocked unit test can't catch a missing/misconfigured
 * AuditingEntityListener since that only fires through a real
 * EntityManager/persistence context.
 */
@Transactional
class AuditingIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private InstitutionRepository institutionRepository;

    private Institution newInstitution() {
        Institution institution = new Institution();
        institution.setName("Audit Test Institution");
        institution.setSlug("audit-test-" + System.nanoTime());
        institution.setCnpj(String.valueOf(System.nanoTime()).substring(0, 14));
        institution.setSubscriptionStatus(SubscriptionStatus.TRIAL);
        return institution;
    }

    @Test
    void createdAtIsPopulatedOnInsert() {
        Institution saved = institutionRepository.saveAndFlush(newInstitution());

        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getCreatedAt()).isCloseTo(LocalDateTime.now(), new org.assertj.core.data.TemporalUnitWithinOffset(5, ChronoUnit.SECONDS));
    }

    @Test
    void updatedAtChangesOnUpdate() throws InterruptedException {
        Institution saved = institutionRepository.saveAndFlush(newInstitution());
        LocalDateTime firstUpdatedAt = saved.getUpdatedAt();
        assertThat(firstUpdatedAt).isNotNull();

        Thread.sleep(50);

        saved.setName("Renamed Institution");
        Institution updated = institutionRepository.saveAndFlush(saved);

        assertThat(updated.getUpdatedAt()).isAfter(firstUpdatedAt);
    }
}
