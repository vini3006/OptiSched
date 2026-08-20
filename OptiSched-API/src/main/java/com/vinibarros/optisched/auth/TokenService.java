package com.vinibarros.optisched.auth;

import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TokenService {

    // Kept in sync with the "access_token" cookie's maxAge in AuthController —
    // the cookie must not outlive the JWT it carries, or the client looks
    // logged in while every request 401s.
    public static final long EXPIRES_IN_SECONDS = 60L * 60 * 8; // 8 horas

    private final JwtEncoder jwtEncoder;

    public TokenService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    public String generateToken(Long userId, String email, String name, Long institutionId, String role, Long professorId, String institutionType) {
        Instant now = Instant.now();

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer("optisched-api")
                .subject(email)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(EXPIRES_IN_SECONDS))
                .claim("user_id", userId)
                .claim("name", name)
                .claim("role", role)
                .claim("scope", "ROLE_" + role);

        if (institutionId != null) {
            claimsBuilder.claim("institution_id", institutionId);
        }

        if (professorId != null) {
            claimsBuilder.claim("professor_id", professorId);
        }

        if (institutionType != null) {
            claimsBuilder.claim("institution_type", institutionType);
        }

        return this.jwtEncoder.encode(JwtEncoderParameters.from(claimsBuilder.build())).getTokenValue();
    }
}
