package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    boolean existsByDayOfWeekAndStartTimeAndEndTime(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime);
    List<TimeSlot> findByDayOfWeek(DayOfWeek dayOfWeek);
    @Query("""
        SELECT COUNT(t) > 0
        FROM TimeSlot t
        WHERE :startTime < t.endTime
          AND :endTime > t.startTime
          AND NOT (t.startTime = :startTime AND t.endTime = :endTime)
    """)
    boolean existsOverlappingTimeSlot(
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );
}
