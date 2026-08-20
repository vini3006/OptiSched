package com.vinibarros.optisched.auth;

import com.vinibarros.optisched.dto.response.UserResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final String COOKIE_NAME = "access_token";

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final JwtDecoder jwtDecoder;
    private final JwtBlacklistService jwtBlacklistService;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordResetService,
            JwtDecoder jwtDecoder,
            JwtBlacklistService jwtBlacklistService
    ) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.jwtDecoder = jwtDecoder;
        this.jwtBlacklistService = jwtBlacklistService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletResponse response) {
        LoginResult result = authService.login(request);

        Cookie cookie = new Cookie(COOKIE_NAME, result.token());
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) TokenService.EXPIRES_IN_SECONDS);
        cookie.setAttribute("SameSite", cookieSameSite());
        response.addCookie(cookie);

        AuthResponse body = new AuthResponse(result.userId(), result.email(), result.name(), result.role(), result.institutionId(), result.professorId(), result.institutionType());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        blacklistCurrentToken(request);

        Cookie cookie = new Cookie(COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", cookieSameSite());
        response.addCookie(cookie);

        return ResponseEntity.noContent().build();
    }

    /**
     * Frontend (Vercel) and API (EC2) live on different registrable domains
     * in production, making every fetch/XHR call cross-site — browsers only
     * attach SameSite=Lax cookies to top-level navigations, not JS requests,
     * so the JWT cookie set on /auth/login would never come back on
     * subsequent calls. SameSite=None fixes that, but browsers only accept
     * None on cookies that are also Secure, which is exactly when
     * cookieSecure is true (production, HTTPS). Locally (dev, HTTP,
     * cookieSecure=false) frontend and API share the same registrable
     * domain (just different ports), so Lax already works there.
     */
    private String cookieSameSite() {
        return cookieSecure ? "None" : "Lax";
    }

    /**
     * CookieBearerTokenResolver deliberately skips authentication for
     * /auth/logout (see its own comment), so there's no Jwt principal
     * already sitting on the SecurityContext here — the raw token has to be
     * read straight off the request's own cookie instead, then decoded just
     * far enough to find its expiry (JwtDecoder still verifies the
     * signature, so a forged cookie value can't blacklist an arbitrary hash).
     * A missing, malformed, or already-expired token isn't an error: logout
     * must succeed either way, there's just nothing left worth blacklisting.
     */
    private void blacklistCurrentToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return;
        }

        Arrays.stream(request.getCookies())
                .filter(c -> COOKIE_NAME.equals(c.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .filter(token -> !token.isBlank())
                .ifPresent(token -> {
                    try {
                        Jwt jwt = jwtDecoder.decode(token);
                        jwtBlacklistService.blacklist(token, jwt.getExpiresAt());
                    } catch (JwtException e) {
                        // Already invalid/expired/malformed — nothing to blacklist.
                    }
                });
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
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
        String name = jwt.getClaim("name");
        String email = jwt.getSubject();
        String institutionType = jwt.getClaim("institution_type");

        AuthResponse response = new AuthResponse(userId, email, name, role, institutionId, professorId, institutionType);
        return ResponseEntity.ok(response);
    }
}