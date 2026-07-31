package com.vinibarros.optisched.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "professor_qualification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfessorQualification extends Auditable {

    @EmbeddedId
    private ProfessorQualificationId id = new ProfessorQualificationId();

    @ManyToOne(fetch = FetchType.LAZY,optional = false)
    @MapsId("professorId")
    @JoinColumn(name = "professor_id")
    private Professor professor;

    @ManyToOne(fetch = FetchType.LAZY,optional = false)
    @MapsId("subjectId")
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;
}
