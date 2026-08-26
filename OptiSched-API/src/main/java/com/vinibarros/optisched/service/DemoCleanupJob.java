package com.vinibarros.optisched.service;

import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.repository.InstitutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Storage hygiene, not access control — InstitutionFilter already blocks
 * every authenticated request against an expired demo institution for free
 * (expiresAt check). This just reclaims the rows so demo institutions don't
 * accumulate forever. Cascade delete (ON DELETE CASCADE on every FK
 * referencing institution(id), confirmed across all migrations) removes
 * every child row for free — InstitutionService.delete just triggers it.
 */
@Component
public class DemoCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(DemoCleanupJob.class);
    private static final long FIXED_RATE_MILLIS = 20 * 60 * 1000;

    private final InstitutionRepository institutionRepository;
    private final InstitutionService institutionService;

    public DemoCleanupJob(InstitutionRepository institutionRepository, InstitutionService institutionService) {
        this.institutionRepository = institutionRepository;
        this.institutionService = institutionService;
    }

    @Scheduled(fixedRate = FIXED_RATE_MILLIS)
    public void cleanupExpiredDemoInstitutions() {
        List<Institution> expired = institutionRepository.findByDemoTrueAndExpiresAtBefore(LocalDateTime.now());

        for (Institution institution : expired) {
            try {
                institutionService.delete(institution.getId());
            } catch (Exception e) {
                // One bad row must not stop the rest of the batch from being cleaned up.
                log.warn("Failed to clean up expired demo institution {}", institution.getId(), e);
            }
        }
    }
}
