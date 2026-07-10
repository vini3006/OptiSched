package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Availability;
import com.vinibarros.optisched.entity.AvailabilityId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, AvailabilityId> {
    List<Availability> findByProfessorId(Long professorId);
    List<Availability> findByTimeSlotId(Long timeSlotId);
    List<Availability> findByProfessorIdAndTimeSlotId(Long professorId, Long timeSlotId);
}
