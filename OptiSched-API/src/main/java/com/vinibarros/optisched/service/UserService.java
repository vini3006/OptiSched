package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.ProfessorRequest;
import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.dto.response.UserResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.UserMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.UserRepository;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final ProfessorService professorService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;

    public UserService(UserRepository userRepository, InstitutionRepository institutionRepository, ProfessorService professorService, UserMapper userMapper, PasswordEncoder passwordEncoder, Validator validator){
        this.userRepository = userRepository;
        this.institutionRepository = institutionRepository;
        this.professorService = professorService;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
    }

    @Transactional
    public UserResponse createSuperAdmin(UserRequest request) {
        if(userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        User user = userMapper.toEntity(request, UserRole.SUPER_ADMIN, null);
        user.setPassword(passwordEncoder.encode(request.password()));

        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse createAdmin(UserRequest request, Long institutionId) {
        User saved = processUserCreation(request, institutionId, UserRole.ADMIN);
        return userMapper.toResponse(saved);
    }

    @Transactional
    public UserResponse createProfessor(UserRequest request, Long institutionId) {
        User saved = processUserCreation(request, institutionId, UserRole.PROFESSOR);

        professorService.create(request, saved, saved.getInstitution());

        return userMapper.toResponse(saved);
    }

    /**
     * Imports professors from a CSV file, one row at a time. Each row calls
     * the same {@link #processUserCreation} + {@link ProfessorService#create}
     * path used by the single-record endpoint, in its own transaction (this
     * method is deliberately NOT @Transactional), so a bad row never rolls
     * back the rows already imported before it.
     */
    public ImportResultResponse importProfessorsFromCsv(MultipartFile file, Long institutionId) {
        int total = 0;
        int success = 0;
        List<ImportRowError> errors = new ArrayList<>();

        try (CSVParser parser = CsvUtils.parse(file)) {
            for (CSVRecord record : parser) {
                total++;
                try {
                    String name = record.get("name");
                    String email = record.get("email");
                    String password = record.get("password");
                    Integer maxDailyTimeSlots = CsvUtils.parseIntOrNull(CsvUtils.getOptional(record, "maxDailyTimeSlots"));
                    Integer maxWeeklyTimeSlots = CsvUtils.parseIntOrNull(CsvUtils.getOptional(record, "maxWeeklyTimeSlots"));

                    UserRequest userRequest = new UserRequest(name, email, password);
                    CsvUtils.validate(validator, userRequest);

                    ProfessorRequest hourCaps = new ProfessorRequest(name, maxDailyTimeSlots, maxWeeklyTimeSlots);
                    CsvUtils.validate(validator, hourCaps);

                    User saved = processUserCreation(userRequest, institutionId, UserRole.PROFESSOR);
                    Professor professor = professorService.create(userRequest, saved, saved.getInstitution());

                    if (maxDailyTimeSlots != null || maxWeeklyTimeSlots != null) {
                        professorService.update(professor.getId(), hourCaps, institutionId);
                    }

                    success++;
                } catch (Exception e) {
                    errors.add(new ImportRowError(record.getRecordNumber(), e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read CSV file", e);
        }

        return new ImportResultResponse(total, success, errors);
    }

    // --- AUXILIAR METHOD  ---
    private User processUserCreation(UserRequest request, Long institutionId, UserRole role){
        if(userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        User user = userMapper.toEntity(request, role, institution);
        user.setPassword(passwordEncoder.encode(request.password()));

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id, Long institutionId) {
        User user = userRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        return userMapper.toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll(Long institutionId) {
        return userRepository.findByInstitutionId(institutionId)
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long id, Long institutionId, boolean requestedByAdmin) {
        User user = userRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (requestedByAdmin && user.getRole() != UserRole.PROFESSOR) {
            throw new AccessDeniedException("Admins can only delete Professor accounts.");
        }

        if (user.getRole() == UserRole.PROFESSOR) {
            // Deleting a Professor's User row directly (bypassing ProfessorService)
            // used to leave the Professor row's qualifications/availabilities
            // orphaned or hit an unhandled FK violation. Route through the same
            // in-use-checked, cascade-aware delete used by ProfessorController.
            professorService.deleteByUserId(id, institutionId);
            return;
        }

        userRepository.deleteById(id);
    }
}
