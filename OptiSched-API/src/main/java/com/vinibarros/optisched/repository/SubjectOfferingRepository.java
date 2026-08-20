package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.SubjectOffering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectOfferingRepository extends JpaRepository<SubjectOffering, Long> {
    boolean existsByIdAndInstitutionId(Long id, Long institutionId);
    Optional<SubjectOffering> findByIdAndInstitutionId(Long id, Long institutionId);
    List<SubjectOffering> findAllByInstitutionId(Long institutionId);
    List<SubjectOffering> findByCourseId(Long courseId);
    List<SubjectOffering> findByTurmaId(Long turmaId);
    List<SubjectOffering> findBySubjectId(Long subjectId);
    List<SubjectOffering> findBySemesterId(Long semesterId);
    boolean existsByCourseIdAndSubjectIdAndSemesterIdAndSectionAndInstitutionId(
            Long courseId,
            Long subjectId,
            Long semesterId,
            String section,
            Long institutionId
    );
    Optional<SubjectOffering> findByTurmaIdAndSubjectIdAndSemesterId(
            Long turmaId,
            Long subjectId,
            Long semesterId
    );
}
