package com.vinibarros.optisched.config;

import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import com.vinibarros.optisched.repository.InstitutionRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Set;

@Component
public class InstitutionFilter implements Filter {

    private static final Set<SubscriptionStatus> ALLOWED_STATUSES =
            Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL);

    private final InstitutionRepository institutionRepository;

    public InstitutionFilter(InstitutionRepository institutionRepository) {
        this.institutionRepository = institutionRepository;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {

            Long institutionId = jwt.getClaim("institution_id");
            Long professorId = jwt.getClaim("professor_id");
            String role = jwt.getClaim("role");
            String path = ((HttpServletRequest) request).getServletPath();

            if ("PROFESSOR".equals(role) && professorId == null && !path.startsWith("/auth/")) {
                HttpServletResponse httpResponse = (HttpServletResponse) response;
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write(
                        "{\"timestamp\":\"" + Instant.now() + "\","
                                + "\"status\":403,"
                                + "\"error\":\"Forbidden\","
                                + "\"message\":\"Professor account is missing its professor record.\"}"
                );
                return;
            }

            if (institutionId != null && !path.startsWith("/auth/")) {
                if (!isSubscriptionActive(institutionId)) {
                    HttpServletResponse httpResponse = (HttpServletResponse) response;
                    httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    httpResponse.setContentType("application/json");
                    httpResponse.getWriter().write(
                            "{\"timestamp\":\"" + Instant.now() + "\","
                                    + "\"status\":403,"
                                    + "\"error\":\"Forbidden\","
                                    + "\"message\":\"Institution subscription is not active.\"}"
                    );
                    return;
                }

                InstitutionContext.setCurrentInstitution(institutionId);

                request.setAttribute("institutionIdAdmin", institutionId);
                request.setAttribute("institutionIdProfessor", institutionId);
            }

            if (professorId != null) {
                request.setAttribute("authenticatedProfessorId", professorId);
            }
        }

        try {
            chain.doFilter(request, response);
        } finally {
            InstitutionContext.clear();
        }
    }

    private boolean isSubscriptionActive(Long institutionId) {
        Institution institution = institutionRepository.findById(institutionId).orElse(null);

        if (institution == null || !ALLOWED_STATUSES.contains(institution.getSubscriptionStatus())) {
            return false;
        }

        LocalDateTime expiresAt = institution.getExpiresAt();
        return expiresAt == null || expiresAt.isAfter(LocalDateTime.now());
    }
}
