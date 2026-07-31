package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.enums.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Semester> findByIdAndInstitutionId(Long id, Long institutionId);
    List<Semester> findAllByInstitutionId(Long institutionId);
    boolean existsByYearAndTermAndInstitutionId(Integer year, Term term, Long institutionId);
    Optional<Semester> findByYearAndTermAndInstitutionId(Integer year, Term term, Long institutionId);
}
