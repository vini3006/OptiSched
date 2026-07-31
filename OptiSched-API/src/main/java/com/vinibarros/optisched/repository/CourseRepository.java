package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    boolean existsByNameAndInstitutionId(String name, Long institutionId);
    List<Course> findAllByInstitutionId(Long institutionId);
    Optional<Course> findByIdAndInstitutionId(Long id, Long institutionId);
    Optional<Course> findByNameAndInstitutionId(String name, Long institutionId);
}
