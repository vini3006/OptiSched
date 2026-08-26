package com.vinibarros.optisched.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.dto.request.DemoInstitutionRequest;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.repository.AvailabilityRepository;
import com.vinibarros.optisched.repository.ClassroomRepository;
import com.vinibarros.optisched.repository.CourseRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorQualificationRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.SemesterRepository;
import com.vinibarros.optisched.repository.SerieRepository;
import com.vinibarros.optisched.repository.SerieSubjectRepository;
import com.vinibarros.optisched.repository.SubjectOfferingRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import com.vinibarros.optisched.repository.TimeSlotRepository;
import com.vinibarros.optisched.repository.TurmaRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises POST /demo/institutions end to end against a real Postgres +
 * Redis, proving a landing-page visitor with zero credentials can get a
 * working ADMIN session in a fresh, self-expiring institution, and that
 * InstitutionFilter's existing expiresAt check covers demo access control
 * for free (see docs/demo-sandbox-plan.md, Fase 1).
 */
@AutoConfigureMockMvc
@Transactional
class DemoIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private SemesterRepository semesterRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private ProfessorQualificationRepository professorQualificationRepository;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private SubjectOfferingRepository subjectOfferingRepository;

    @Autowired
    private SerieRepository serieRepository;

    @Autowired
    private TurmaRepository turmaRepository;

    @Autowired
    private SerieSubjectRepository serieSubjectRepository;

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    @Test
    void createDemoInstitution_withoutAuthentication_returnsWorkingAdminSession() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.20.1.1"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.UNIVERSITY))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.isDemo").value(true))
                .andExpect(jsonPath("$.institutionId").isNotEmpty())
                .andReturn();

        Cookie accessToken = result.getResponse().getCookie("access_token");
        assertThat(accessToken).isNotNull();
        assertThat(accessToken.getValue()).isNotBlank();

        mockMvc.perform(get("/auth/me").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDemo").value(true));
    }

    @Test
    void createDemoInstitution_calledTwiceForSameType_doesNotCollideOnNameOrSlugOrCnpj() throws Exception {
        String body = objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.SCHOOL));

        mockMvc.perform(post("/demo/institutions").with(fromIp("10.20.1.2")).contentType("application/json").content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/demo/institutions").with(fromIp("10.20.1.3")).contentType("application/json").content(body))
                .andExpect(status().isOk());
    }

    @Test
    void demoInstitution_pastExpiresAt_isRejectedByInstitutionFilter() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.20.1.4"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.UNIVERSITY))))
                .andExpect(status().isOk())
                .andReturn();

        Cookie accessToken = result.getResponse().getCookie("access_token");

        Long institutionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("institutionId").asLong();

        Institution institution = institutionRepository.findById(institutionId).orElseThrow();
        institution.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        institutionRepository.saveAndFlush(institution);

        // /auth/** is deliberately exempt from InstitutionFilter's
        // subscription check (see InstitutionFilter), so the expiry has to
        // be proven against a real tenant-scoped endpoint instead.
        mockMvc.perform(get("/institutions/" + institutionId).cookie(accessToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void createDemoInstitution_university_seedsExpectedRowCounts() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.20.1.5"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.UNIVERSITY))))
                .andExpect(status().isOk())
                .andReturn();

        Long institutionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("institutionId").asLong();

        assertThat(semesterRepository.findAllByInstitutionId(institutionId)).hasSize(1);
        assertThat(subjectRepository.findAllByInstitutionId(institutionId)).hasSize(6);
        assertThat(classroomRepository.findAllByInstitutionId(institutionId)).hasSize(3);
        assertThat(timeSlotRepository.findAllByInstitutionId(institutionId)).hasSize(20);
        assertThat(courseRepository.findAllByInstitutionId(institutionId)).hasSize(2);
        assertThat(subjectOfferingRepository.findAllByInstitutionId(institutionId)).hasSize(4);
        assertThat(professorRepository.findAllByInstitutionId(institutionId)).hasSize(4);
        assertThat(professorQualificationRepository.findAllByInstitutionId(institutionId)).hasSize(9);
        assertThat(availabilityRepository.findAllByInstitutionId(institutionId)).hasSize(4 * 16);
    }

    @Test
    void createDemoInstitution_school_seedsExpectedRowCounts() throws Exception {
        MvcResult result = mockMvc.perform(post("/demo/institutions")
                        .with(fromIp("10.20.1.6"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new DemoInstitutionRequest(InstitutionType.SCHOOL))))
                .andExpect(status().isOk())
                .andReturn();

        Long institutionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("institutionId").asLong();

        assertThat(semesterRepository.findAllByInstitutionId(institutionId)).hasSize(1);
        assertThat(subjectRepository.findAllByInstitutionId(institutionId)).hasSize(6);
        assertThat(classroomRepository.findAllByInstitutionId(institutionId)).hasSize(3);
        assertThat(timeSlotRepository.findAllByInstitutionId(institutionId)).hasSize(20);
        assertThat(serieRepository.findAllByInstitutionId(institutionId)).hasSize(2);
        assertThat(turmaRepository.findAllByInstitutionId(institutionId)).hasSize(3);
        assertThat(serieSubjectRepository.findAllByInstitutionId(institutionId)).hasSize(6);
        assertThat(professorRepository.findAllByInstitutionId(institutionId)).hasSize(4);
        assertThat(professorQualificationRepository.findAllByInstitutionId(institutionId)).hasSize(9);
        assertThat(availabilityRepository.findAllByInstitutionId(institutionId)).hasSize(4 * 16);
        // School-mode offerings are auto-materialized by TurmaOfferingSyncService
        // right before generation, never created directly by the seed.
        assertThat(subjectOfferingRepository.findAllByInstitutionId(institutionId)).isEmpty();
    }
}
