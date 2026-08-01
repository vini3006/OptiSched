package com.vinibarros.optisched.entity;

import com.vinibarros.optisched.enums.RoomType;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "classroom", uniqueConstraints = {
        @UniqueConstraint(name = "unique_classroom_per_institution", columnNames = {"institution_id", "number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Classroom extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String number;

    @Column(nullable = false)
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType type;

    @Column
    private String building;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "classroom")
    private Set<ScheduleEntry> scheduleEntries = new HashSet<>();
}
