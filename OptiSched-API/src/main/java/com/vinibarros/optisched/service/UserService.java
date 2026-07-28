package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.UserResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.UserMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final ProfessorService professorService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, InstitutionRepository institutionRepository, ProfessorService professorService, UserMapper userMapper, PasswordEncoder passwordEncoder){
        this.userRepository = userRepository;
        this.institutionRepository = institutionRepository;
        this.professorService = professorService;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
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

        userRepository.deleteById(id);
    }
}
