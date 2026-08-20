package com.vinibarros.optisched.entity;
import com.vinibarros.optisched.enums.ScheduleStatus;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Schedule extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(name = "generated_at",nullable = false)
    private LocalDateTime generatedAt;

    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    /**
     * Scopes this schedule to a single course — null means it covers the
     * whole institution (every course together), which is the original,
     * still-default behavior. A non-null course lets a schedule be
     * generated/regenerated for just that course, while other courses' own
     * active schedules stay untouched.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    /**
     * SCHOOL-mode mirror of {@link #course}: scopes this schedule to a single
     * turma instead of a course. Never set together with course — a
     * schedule is either whole-institution (both null), course-scoped, or
     * turma-scoped, never both at once.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id")
    private Turma turma;

    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ScheduleEntry> scheduleEntries = new HashSet<>();
}
