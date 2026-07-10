package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    boolean existsByDayOfWeekAndStartTimeAndEndTime(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime);
    List<TimeSlot> findByDayOfWeek(DayOfWeek dayOfWeek);
}
