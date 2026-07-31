package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.ProfessorRequest;
import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.ProfessorResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.mapper.ProfessorMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.ScheduleEntryRepository;
import com.vinibarros.optisched.repository.UserRepository;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@Service
public class ProfessorService {

    private final ProfessorRepository professorRepository;
    private final InstitutionRepository institutionRepository;
    private final ProfessorMapper professorMapper;
    private final UserRepository userRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;

    public ProfessorService(ProfessorRepository professorRepository, InstitutionRepository institutionRepository, ProfessorMapper professorMapper, UserRepository userRepository, ScheduleEntryRepository scheduleEntryRepository){
        this.professorRepository = professorRepository;
        this.institutionRepository = institutionRepository;
        this.professorMapper = professorMapper;
        this.userRepository = userRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @Transactional
    public Professor create(UserRequest request, User savedUser, Institution institution) {
        Professor professor = professorMapper.toEntity(request, institution);
        professor.setUser(savedUser);

        return professorRepository.save(professor);
    }

    @Transactional(readOnly = true)
    public ProfessorResponse findById(Long id, Long institutionId){
        Professor professor = professorRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Professor", id));
        return professorMapper.toResponse(professor);
    }

    @Transactional(readOnly = true)
    public List<ProfessorResponse> findAll(Long institutionId){
        return professorRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(professorMapper::toResponse)
                .toList();
    }

    @Transactional
    public ProfessorResponse update(Long id, ProfessorRequest request, Long institutionId){
        Professor professor = professorRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Professor", id));

        professor.setName(request.name());
        professor.setMaxDailyTimeSlots(request.maxDailyTimeSlots());
        professor.setMaxWeeklyTimeSlots(request.maxWeeklyTimeSlots());

        Professor updated = professorRepository.save(professor);
        return professorMapper.toResponse(updated);
    }

    @Transactional(readOnly = true)
    public byte[] exportToCsv(Long institutionId) {
        List<Professor> professors = professorRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of("name", "email", "maxDailyTimeSlots", "maxWeeklyTimeSlots");
        List<List<String>> rows = professors.stream()
                .map(p -> List.of(
                        p.getName(),
                        p.getUser() != null ? p.getUser().getEmail() : "",
                        p.getMaxDailyTimeSlots() != null ? p.getMaxDailyTimeSlots().toString() : "",
                        p.getMaxWeeklyTimeSlots() != null ? p.getMaxWeeklyTimeSlots().toString() : ""
                ))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        Professor professor = professorRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Professor", id));

        deleteInternal(professor);
    }

    @Transactional
    public void deleteByUserId(Long userId, Long institutionId){
        Professor professor = professorRepository.findByUserId(userId)
                .filter(p -> p.getInstitution().getId().equals(institutionId))
                .orElseThrow(() -> new ResourceNotFoundException("Professor for user", userId));

        deleteInternal(professor);
    }

    private void deleteInternal(Professor professor){
        if(scheduleEntryRepository.existsByProfessorId(professor.getId())){
            throw new ResourceInUseException("Professor cannot be deleted because they have schedule entries in a generated schedule.");
        }

        User user = professor.getUser();

        // Removes the Professor row first (JPA cascade/orphanRemoval cleans up
        // qualifications/availabilities), then the linked User row to make sure
        // the account's login is revoked along with the Professor record —
        // deleting only one of the two used to leave a working "ghost" login.
        professorRepository.delete(professor);

        if(user != null){
            userRepository.deleteById(user.getId());
        }
    }
}
