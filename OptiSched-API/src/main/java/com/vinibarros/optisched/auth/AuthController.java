package com.vinibarros.optisched.auth;

import com.vinibarros.optisched.dto.response.UserResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletResponse response) {
        LoginResult result = authService.login(request);

        Cookie cookie = new Cookie("access_token", result.token());
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 8);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);

        AuthResponse body = new AuthResponse(result.userId(), result.email(), result.role(), result.institutionId(), result.professorId());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userId = jwt.getClaim("user_id");
        Long institutionId = jwt.getClaim("institution_id");
        Long professorId = jwt.getClaim("professor_id");
        String role = jwt.getClaim("role");
        String email = jwt.getSubject();

        AuthResponse response = new AuthResponse(userId, email, role, institutionId, professorId);
        return ResponseEntity.ok(response);
    }
}