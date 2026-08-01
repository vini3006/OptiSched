package com.vinibarros.optisched.entity;

import com.vinibarros.optisched.enums.PreferredShift;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Course extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "total_semesters", nullable = false)
    private Integer totalSemesters;

    /**
     * When set, every SubjectOffering of this course is hard-restricted to
     * TimeSlots within this shift during schedule generation — unlike the
     * per-request preferredShift (soft, whole-generation), this is a
     * per-course, always-enforced constraint. Null means no restriction.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "allowed_shift")
    private PreferredShift allowedShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "course")
    private Set<SubjectOffering> offerings = new HashSet<>();
}
