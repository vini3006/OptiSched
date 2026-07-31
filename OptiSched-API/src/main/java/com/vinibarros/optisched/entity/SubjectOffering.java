package com.vinibarros.optisched.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "subject_offering",
        uniqueConstraints = @UniqueConstraint(name = "unique_subject_offering_per_institution",
                columnNames = {"course_id", "subject_id", "semester_id", "section", "institution_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubjectOffering extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(nullable = false)
    private String section;

    @Column(name = "expected_students", nullable = false)
    private Integer expectedStudents;

    @Column(name = "recommended_semester")
    private Integer recommendedSemester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "subjectOffering")
    private Set<ScheduleEntry> scheduleEntries = new HashSet<>();
}
