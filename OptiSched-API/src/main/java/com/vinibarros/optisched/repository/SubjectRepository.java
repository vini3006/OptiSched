package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    List<Subject> findAllByInstitutionId(Long institutionId);
    Optional<Subject> findByIdAndInstitutionId(Long id, Long institutionId);
    boolean existsByCodeAndInstitutionId(String code, Long institutionId);
    Optional<Subject> findByCodeAndInstitutionId(String code, Long institutionId);
}
