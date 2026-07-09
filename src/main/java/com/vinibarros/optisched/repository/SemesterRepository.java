package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.enums.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {
    boolean existsByYearAndTerm(Integer year, Term term);
}
