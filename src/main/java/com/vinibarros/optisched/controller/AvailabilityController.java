package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.AvailabilityRequest;
import com.vinibarros.optisched.dto.response.AvailabilityResponse;
import com.vinibarros.optisched.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/availabilities")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService){
        this.availabilityService = availabilityService;
    }

    @PostMapping
    public ResponseEntity<AvailabilityResponse> create(@Valid @RequestBody AvailabilityRequest request){
        AvailabilityResponse response = availabilityService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<AvailabilityResponse>> findAll(@RequestParam(required = false) Long professorId, @RequestParam(required = false) Long timeSlotId){
        if(professorId != null && timeSlotId != null) return ResponseEntity.ok(availabilityService.findByProfessorAndTimeSlot(professorId, timeSlotId));
        if(professorId != null) return ResponseEntity.ok(availabilityService.findByProfessor(professorId));
        if(timeSlotId != null) return ResponseEntity.ok(availabilityService.findByTimeSlot(timeSlotId));
        return ResponseEntity.ok(availabilityService.findAll());
    }

    @DeleteMapping()
    public ResponseEntity<Void> delete(@RequestParam Long professorId, @RequestParam Long timeSlotId){
        availabilityService.delete(professorId, timeSlotId);
        return ResponseEntity.noContent().build();
    }
}
