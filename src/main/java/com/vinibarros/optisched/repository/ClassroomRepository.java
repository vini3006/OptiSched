package com.vinibarros.optisched.repository;

import com.vinibarros.optisched.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
     boolean existsByNumber(String number);
}
