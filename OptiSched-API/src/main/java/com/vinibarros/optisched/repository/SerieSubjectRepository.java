package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.SerieSubject;
import com.vinibarros.optisched.entity.SerieSubjectId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SerieSubjectRepository extends JpaRepository<SerieSubject, SerieSubjectId> {
    boolean existsByIdAndInstitutionId(SerieSubjectId id, Long institutionId);

    List<SerieSubject> findAllByInstitutionId(Long institutionId);

    Optional<SerieSubject> findByIdAndInstitutionId(SerieSubjectId id, Long institutionId);

    List<SerieSubject> findById_SerieIdAndInstitutionId(Long serieId, Long institutionId);

    List<SerieSubject> findById_SubjectIdAndInstitutionId(Long subjectId, Long institutionId);
}
