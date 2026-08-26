package com.vinibarros.optisched.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.dto.request.DemoInstitutionRequest;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.repository.CourseRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves DemoCleanupJob's method works when invoked directly (not on the
 * scheduler's own clock) and that cascade delete really does remove a demo
 * institution's seeded children, not just the institution row itself.
 */
@AutoConfigureMockMvc
@Transactional
class DemoCleanupJobTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DemoCleanupJob demoCleanupJob;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private CourseRepository courseRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    @Test
    void cleanupExpiredDemoInstitutions_removesTheInstitutionAndItsSeededChildren() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.30.1.1"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.UNIVERSITY))))
                .andExpect(status().isOk())
                .andReturn();

        Long institutionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("institutionId").asLong();

        // Forces every seed-time write (including the composite-id
        // ProfessorQualification/Availability rows, whose insert Hibernate
        // otherwise defers) to flush cleanly on its own, before this test
        // goes on to mutate and delete the Institution those rows
        // reference — isolates "seeding happened" (already covered by
        // DemoIntegrationTest) from "cleanup deletes it" (this test).
        assertThat(courseRepository.findAllByInstitutionId(institutionId)).isNotEmpty();

        // Detaches every entity the seeding just loaded/created from this
        // test's single long-lived persistence context (a test-only
        // artifact — production gets a fresh one per request). Without
        // this, Professor's bidirectional orphanRemoval collections
        // (qualifications/availabilities, never touched directly here)
        // get reconciled mid-flush at the same time as the Institution
        // delete below, and Hibernate throws a spurious
        // TransientObjectException on the Institution reference they still
        // hold in memory.
        entityManager.clear();

        Institution institution = institutionRepository.findById(institutionId).orElseThrow();
        institution.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        institutionRepository.saveAndFlush(institution);

        demoCleanupJob.cleanupExpiredDemoInstitutions();

        assertThat(institutionRepository.findById(institutionId)).isEmpty();
        assertThat(courseRepository.findAllByInstitutionId(institutionId)).isEmpty();
    }

    @Test
    void cleanupExpiredDemoInstitutions_leavesNonExpiredDemoInstitutionsAlone() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.30.1.2"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.SCHOOL))))
                .andExpect(status().isOk())
                .andReturn();

        Long institutionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("institutionId").asLong();

        entityManager.clear();

        demoCleanupJob.cleanupExpiredDemoInstitutions();

        assertThat(institutionRepository.findById(institutionId)).isPresent();
    }
}
