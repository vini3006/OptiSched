package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ScheduleRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService){
        this.scheduleService = scheduleService;
    }

    @PostMapping
    public ResponseEntity<ScheduleResponse> create(@Valid @RequestBody ScheduleRequest request){
        ScheduleResponse response = scheduleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduleResponse> findById(@PathVariable Long id){
        return ResponseEntity.ok(scheduleService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<ScheduleResponse>> findAll() {
        return ResponseEntity.ok(scheduleService.findAll());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ScheduleResponse> alterStatus(@PathVariable Long id) {
        return ResponseEntity.ok(scheduleService.alterStatus(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        scheduleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
