package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Professor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfessorRepository extends JpaRepository<Professor, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Professor> findByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Professor> findByUserId(Long userId);
    List<Professor> findAllByInstitutionId(Long institutionId);
    Optional<Professor> findByUser_EmailAndInstitutionId(String email, Long institutionId);
}
