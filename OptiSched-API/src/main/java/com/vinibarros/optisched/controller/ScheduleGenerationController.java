package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.optimization.ScheduleGenerationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/schedules")
public class ScheduleGenerationController {

    private final ScheduleGenerationService scheduleGenerationService;

    public ScheduleGenerationController(ScheduleGenerationService scheduleGenerationService){
        this.scheduleGenerationService = scheduleGenerationService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ScheduleResponse> generate(@RequestParam Long semesterId){
        ScheduleResponse response = scheduleGenerationService.generateSchedule(semesterId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
