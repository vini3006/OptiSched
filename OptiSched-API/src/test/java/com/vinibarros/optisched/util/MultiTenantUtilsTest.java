package com.vinibarros.optisched.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MultiTenantUtilsTest {

    @Test
    void returnsFirstNonNullCandidate() {
        Long result = MultiTenantUtils.resolveInstitutionId("test action", null, 2L, 3L);

        assertThat(result).isEqualTo(2L);
    }

    @Test
    void prefersEarlierCandidateOverLaterOnes() {
        Long result = MultiTenantUtils.resolveInstitutionId("test action", 1L, 2L, 3L);

        assertThat(result).isEqualTo(1L);
    }

    @Test
    void returnsSingleCandidateWhenOnlyOneProvided() {
        Long result = MultiTenantUtils.resolveInstitutionId("test action", 42L);

        assertThat(result).isEqualTo(42L);
    }

    @Test
    void throwsWhenAllCandidatesAreNull() {
        assertThatThrownBy(() -> MultiTenantUtils.resolveInstitutionId("do the thing", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("do the thing");
    }

    @Test
    void throwsWhenNoCandidatesProvided() {
        assertThatThrownBy(() -> MultiTenantUtils.resolveInstitutionId("do the thing"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
