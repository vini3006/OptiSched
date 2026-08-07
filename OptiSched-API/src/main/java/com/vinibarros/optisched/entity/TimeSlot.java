package com.vinibarros.optisched.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;
import java.time.LocalTime;
import java.time.DayOfWeek;

@Entity
@Table(name = "time_slot")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlot extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private DayOfWeek dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @OneToMany(mappedBy = "timeSlot", cascade = CascadeType.REMOVE)
    private Set<Availability> availabilities = new HashSet<>();

    @OneToMany(mappedBy = "timeSlot")
    private Set<ScheduleEntry> scheduleEntries = new HashSet<>();
}
