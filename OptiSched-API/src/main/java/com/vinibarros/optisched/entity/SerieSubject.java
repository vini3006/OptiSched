package com.vinibarros.optisched.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "serie_subject")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SerieSubject extends Auditable {

    @EmbeddedId
    private SerieSubjectId id = new SerieSubjectId();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("serieId")
    @JoinColumn(name = "serie_id")
    private Serie serie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("subjectId")
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "weekly_workload", nullable = false)
    private Integer weeklyWorkload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;
}
