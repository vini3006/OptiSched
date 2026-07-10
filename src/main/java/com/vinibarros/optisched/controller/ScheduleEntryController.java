package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.service.ScheduleEntryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;

@RestController
@RequestMapping("/schedule-entries")
public class ScheduleEntryController {

    private final ScheduleEntryService scheduleEntryService;

    public ScheduleEntryController(ScheduleEntryService scheduleEntryService){
        this.scheduleEntryService = scheduleEntryService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduleEntryResponse> findById(@PathVariable Long id){
        return ResponseEntity.ok(scheduleEntryService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<ScheduleEntryResponse>> find(@RequestParam Long scheduleId, @RequestParam(required = false) Long professorId, @RequestParam(required = false) Long classroomId, @RequestParam(required = false) DayOfWeek dayOfWeek){
        if(professorId != null) return ResponseEntity.ok(scheduleEntryService.findByScheduleAndProfessor(scheduleId, professorId));
        if(classroomId != null) return ResponseEntity.ok(scheduleEntryService.findByScheduleAndClassroom(scheduleId, classroomId));
        if(dayOfWeek != null) return ResponseEntity.ok(scheduleEntryService.findByScheduleAndDayOfWeek(scheduleId, dayOfWeek));
        return ResponseEntity.ok(scheduleEntryService.findBySchedule(scheduleId)); //TODO: validate that only one optional filter is provided
    }
}
