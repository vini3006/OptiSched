package com.vinibarros.optisched.entity;

import com.vinibarros.optisched.enums.RoomType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "subject", uniqueConstraints = {
        @UniqueConstraint(name = "unique_subject_code_per_institution", columnNames = {"institution_id", "code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class Subject extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer workload; //Workload refers to the weekly amount of classes

    @Enumerated(EnumType.STRING)
    @Column(name = "required_room_type")
    private RoomType requiredRoomType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProfessorQualification> qualifications = new HashSet<>();

    @OneToMany(mappedBy = "subject")
    private Set<SubjectOffering> offerings = new HashSet<>();
}
