package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.auth.AuthCookieService;
import com.vinibarros.optisched.auth.AuthResponse;
import com.vinibarros.optisched.dto.request.DemoInstitutionRequest;
import com.vinibarros.optisched.service.DemoService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/demo")
public class DemoController {

    private final DemoService demoService;
    private final AuthCookieService authCookieService;

    public DemoController(DemoService demoService, AuthCookieService authCookieService) {
        this.demoService = demoService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/institutions")
    public ResponseEntity<AuthResponse> createDemoInstitution(
            @Valid @RequestBody DemoInstitutionRequest request,
            HttpServletResponse response
    ) {
        AuthResponse body = demoService.createDemoInstitution(request.type(), response, authCookieService);
        return ResponseEntity.ok(body);
    }
}
