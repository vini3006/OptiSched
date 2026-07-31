package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.UserResponse;
import com.vinibarros.optisched.service.UserService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/super-admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createSuperAdmin(@Valid @RequestBody UserRequest request) {
        UserResponse response = userService.createSuperAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createAdmin(
            @Valid @RequestBody UserRequest request,
            @RequestParam Long institutionId) {

        UserResponse response = userService.createAdmin(request, institutionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/professors")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createProfessor(
            @Valid @RequestBody UserRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "sign up a professor",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        UserResponse response = userService.createProfessor(request, targetInstitutionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/professors/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ImportResultResponse> importProfessors(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "import professors",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(userService.importProfessorsFromCsv(file, targetInstitutionId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "fetch user details",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(userService.findById(id, targetInstitutionId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<UserResponse>> findAll(
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list users",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(userService.findAll(targetInstitutionId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId =  MultiTenantUtils.resolveInstitutionId(
                "delete a user",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        userService.delete(id, targetInstitutionId, institutionIdAdmin != null);
        return ResponseEntity.noContent().build();
    }
}
