package com.vinibarros.optisched.service;

import com.vinibarros.optisched.auth.AuthCookieService;
import com.vinibarros.optisched.auth.AuthResponse;
import com.vinibarros.optisched.auth.TokenService;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Creates a throwaway, real Institution row (isDemo=true, expiresAt=+2h) so
 * a landing-page visitor lands in the exact same product a paying customer
 * uses, with no new CRUD surface needed — InstitutionFilter already enforces
 * expiresAt for any authenticated request. See docs/demo-sandbox-plan.md.
 */
@Service
public class DemoService {

    private static final long DEMO_TTL_HOURS = 2;

    private final InstitutionRepository institutionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final DemoSeedService demoSeedService;

    public DemoService(
            InstitutionRepository institutionRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            DemoSeedService demoSeedService
    ) {
        this.institutionRepository = institutionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.demoSeedService = demoSeedService;
    }

    @Transactional
    public AuthResponse createDemoInstitution(InstitutionType type, HttpServletResponse response, AuthCookieService authCookieService) {
        Institution institution = new Institution();
        institution.setName(demoInstitutionName(type));
        institution.setSlug(UUID.randomUUID().toString());
        institution.setCnpj(uniqueDemoCnpj());
        institution.setSubscriptionStatus(SubscriptionStatus.TRIAL);
        institution.setExpiresAt(LocalDateTime.now().plusHours(DEMO_TTL_HOURS));
        institution.setType(type);
        institution.setDemo(true);
        institution = institutionRepository.save(institution);

        User admin = new User();
        admin.setName("Admin Demo");
        admin.setEmail("demo-" + UUID.randomUUID() + "@optisched.local");
        admin.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        admin.setRole(UserRole.ADMIN);
        admin.setInstitution(institution);
        admin = userRepository.save(admin);

        if (type == InstitutionType.UNIVERSITY) {
            demoSeedService.seedUniversity(institution.getId());
        } else {
            demoSeedService.seedSchool(institution.getId());
        }

        String token = tokenService.generateToken(
                admin.getId(),
                admin.getEmail(),
                admin.getName(),
                institution.getId(),
                admin.getRole().name(),
                null,
                institution.getType().name(),
                true
        );

        authCookieService.setAuthCookie(response, token);

        return new AuthResponse(
                admin.getId(),
                admin.getEmail(),
                admin.getName(),
                admin.getRole().name(),
                institution.getId(),
                null,
                institution.getType().name(),
                true
        );
    }

    private String demoInstitutionName(InstitutionType type) {
        String label = type == InstitutionType.UNIVERSITY ? "Universidade" : "Escola";
        return "Demo " + label + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * The `cnpj` column is unique AND NOT NULL at the DB level (V2 migration)
     * — contrary to what the docs/demo-sandbox-plan.md research assumed —
     * so a demo institution needs a synthetic, collision-checked value
     * rather than null. "DM" prefix plus 12 random digits keeps it visually
     * distinguishable from a real 14-digit CNPJ in any admin view.
     */
    private String uniqueDemoCnpj() {
        String candidate;
        do {
            long digits = ThreadLocalRandom.current().nextLong(0, 1_000_000_000_000L);
            candidate = "DM" + String.format("%012d", digits);
        } while (institutionRepository.existsByCnpj(candidate));
        return candidate;
    }
}
