package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.TimeSlotRequest;
import com.vinibarros.optisched.dto.response.TimeSlotResponse;
import com.vinibarros.optisched.service.TimeSlotService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;

@RestController
@RequestMapping("/time-slots")
public class TimeSlotController {

    private final TimeSlotService timeSlotService;

    public TimeSlotController(TimeSlotService timeSlotService){
        this.timeSlotService = timeSlotService;
    }

    @PostMapping
    public ResponseEntity<TimeSlotResponse> create(@Valid @RequestBody TimeSlotRequest request){
        TimeSlotResponse response = timeSlotService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TimeSlotResponse> findById(@PathVariable Long id){
        return ResponseEntity.ok(timeSlotService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<TimeSlotResponse>> findAll(@RequestParam(required = false) DayOfWeek dayOfWeek){
        if(dayOfWeek != null) return ResponseEntity.ok(timeSlotService.findByDayOfWeek(dayOfWeek));
        return ResponseEntity.ok(timeSlotService.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        timeSlotService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
