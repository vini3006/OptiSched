package com.vinibarros.optisched.auth;

import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TokenService {

    private final JwtEncoder jwtEncoder;

    public TokenService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    public String generateToken(Long userId, String email, Long institutionId, String role, Long professorId) {
        Instant now = Instant.now();
        long expiresIn = 3600L; // 1 hora

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer("optisched-api")
                .subject(email)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(expiresIn))
                .claim("user_id", userId)
                .claim("role", role)
                .claim("scope", "ROLE_" + role);

        if (institutionId != null) {
            claimsBuilder.claim("institution_id", institutionId);
        }

        if (professorId != null) {
            claimsBuilder.claim("professor_id", professorId);
        }

        return this.jwtEncoder.encode(JwtEncoderParameters.from(claimsBuilder.build())).getTokenValue();
    }
}
