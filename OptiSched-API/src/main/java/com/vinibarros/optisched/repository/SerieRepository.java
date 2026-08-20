package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Serie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SerieRepository extends JpaRepository<Serie, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Serie> findByIdAndInstitutionId(Long id, Long institutionId);
    List<Serie> findAllByInstitutionId(Long institutionId);
    Optional<Serie> findByNameAndInstitutionId(String name, Long institutionId);
}
