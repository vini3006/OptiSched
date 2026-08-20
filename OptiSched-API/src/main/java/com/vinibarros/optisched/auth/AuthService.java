package com.vinibarros.optisched.auth;

import com.vinibarros.optisched.entity.Professor;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.repository.ProfessorRepository;
import com.vinibarros.optisched.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ProfessorRepository professorRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(
            UserRepository userRepository,
            ProfessorRepository professorRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService
    ) {
        this.userRepository = userRepository;
        this.professorRepository = professorRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @Transactional(readOnly = true)
    public LoginResult login(AuthRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid e-mail or password."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid e-mail or password.");
        }

        Long institutionId = null;
        String institutionType = null;
        Long professorId = null;

        if (user.getInstitution() != null) {
            institutionId = user.getInstitution().getId();
            institutionType = user.getInstitution().getType().name();
        }

        if ("PROFESSOR".equals(user.getRole().name())) {
            professorId = professorRepository.findByUserId(user.getId())
                    .map(Professor::getId)
                    .orElse(null);
        }

        String token = tokenService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getName(),
                institutionId,
                user.getRole().name(),
                professorId,
                institutionType
        );

        return new LoginResult(
                token,
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                institutionId,
                professorId,
                institutionType
        );
    }
}
