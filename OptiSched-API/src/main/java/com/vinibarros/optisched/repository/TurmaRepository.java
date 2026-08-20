package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Turma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TurmaRepository extends JpaRepository<Turma, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Turma> findByIdAndInstitutionId(Long id, Long institutionId);
    List<Turma> findAllByInstitutionId(Long institutionId);
    Optional<Turma> findByNameAndInstitutionId(String name, Long institutionId);
    List<Turma> findAllByInstitutionIdAndYear(Long institutionId, Integer year);
    List<Turma> findBySerieId(Long serieId);
}
