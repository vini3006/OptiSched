package com.vinibarros.optisched.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "subject_offering")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubjectOffering extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * XOR with {@link #turma}: set for UNIVERSITY-mode offerings (with
     * {@link #section}), null for SCHOOL-mode ones — enforced at the DB level
     * by chk_subject_offering_course_xor_turma (V20), not by JPA.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    private String section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id")
    private Turma turma;

    @Column(name = "expected_students", nullable = false)
    private Integer expectedStudents;

    @Column(name = "recommended_semester")
    private Integer recommendedSemester;

    /**
     * Only set for SCHOOL-mode (turma) offerings, synced from
     * {@link SerieSubject#getWeeklyWorkload()} — overrides
     * {@link Subject#getWorkload()} for that turma's offering. Null for
     * UNIVERSITY-mode (course) offerings, which always use Subject.workload.
     */
    @Column(name = "weekly_workload")
    private Integer weeklyWorkload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "subjectOffering")
    private Set<ScheduleEntry> scheduleEntries = new HashSet<>();
}
