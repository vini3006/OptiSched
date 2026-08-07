package com.vinibarros.optisched.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.auth.AuthRequest;
import com.vinibarros.optisched.dto.request.SubjectRequest;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Subject;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.SubjectRepository;
import com.vinibarros.optisched.repository.UserRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Item A7 of docs/deploy-readiness-plan.md: proves — against a real endpoint,
 * real Postgres, real Spring MVC/JPA stack, not just by code inspection —
 * that classic SQLi/XSS payloads in a free-text field are handled safely by
 * the JPA/JPQL parameterization this app relies on everywhere. No query in
 * this codebase concatenates user input into SQL/JPQL (everything goes
 * through Spring Data derived queries or @Query with bind parameters), so
 * the expectation here is simply that a malicious string round-trips as an
 * inert piece of text: persisted and returned byte-for-byte, no SQL executed
 * as a side effect, no schema damage, no HTML executed (this is a JSON API —
 * escaping-on-render is the frontend's job, not this endpoint's).
 *
 * Subject.name is used as the target field: a plain free-text column, and
 * POST /subjects is a real, authenticated, multi-tenant-aware endpoint
 * exactly like every other admin-facing create endpoint in this codebase.
 */
@AutoConfigureMockMvc
@Transactional
class MaliciousPayloadIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private Cookie loginAsFreshAdmin(String ip) throws Exception {
        long nonce = System.nanoTime();
        Institution institution = new Institution();
        institution.setName("Malicious Payload Test Institution " + nonce);
        institution.setSlug("malicious-payload-test-" + nonce);
        institution.setCnpj(String.valueOf(nonce % 100_000_000_000_00L));
        institution = institutionRepository.saveAndFlush(institution);

        String email = "admin-" + System.nanoTime() + "@test.com";
        String rawPassword = "adminPassword123";

        User admin = new User();
        admin.setName("Admin");
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(rawPassword));
        admin.setRole(UserRole.ADMIN);
        admin.setInstitution(institution);
        userRepository.saveAndFlush(admin);

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .with(fromIp(ip))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new AuthRequest(email, rawPassword))))
                .andExpect(status().isOk())
                .andReturn();

        return loginResult.getResponse().getCookie("access_token");
    }

    @Test
    void sqlInjectionPayloadInSubjectName_isPersistedAsLiteralTextWithNoSchemaDamage() throws Exception {
        Cookie cookie = loginAsFreshAdmin("10.10.3.1");
        String payload = "'; DROP TABLE users; --";
        long usersBefore = userRepository.count();

        MvcResult result = mockMvc.perform(post("/subjects")
                        .cookie(cookie)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SubjectRequest("SQLI1", payload, 40, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(payload))
                .andReturn();

        // The payload targets the users table specifically — if it had executed
        // as SQL instead of being bound as a literal, this table would be gone.
        assertThat(userRepository.count()).isEqualTo(usersBefore);

        Long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        Subject saved = subjectRepository.findById(id).orElseThrow();
        assertThat(saved.getName()).isEqualTo(payload);
    }

    @Test
    void xssPayloadInSubjectName_isPersistedAndReturnedVerbatimUnescaped() throws Exception {
        Cookie cookie = loginAsFreshAdmin("10.10.3.2");
        String payload = "<script>alert(1)</script>";

        MvcResult result = mockMvc.perform(post("/subjects")
                        .cookie(cookie)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SubjectRequest("XSS1", payload, 40, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(payload))
                .andReturn();

        Long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        Subject saved = subjectRepository.findById(id).orElseThrow();
        assertThat(saved.getName()).isEqualTo(payload);
    }
}
