package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InstitutionRepository extends JpaRepository<Institution, Long> {
    Optional<Institution> findBySubscriptionId(String subscriptionId);
    boolean existsByCnpj(String cnpj);
    boolean existsByName(String name);
    List<Institution> findByDemoTrueAndExpiresAtBefore(LocalDateTime cutoff);
}
