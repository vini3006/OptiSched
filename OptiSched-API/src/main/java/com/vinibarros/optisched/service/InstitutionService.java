package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.InstitutionRequest;
import com.vinibarros.optisched.dto.response.InstitutionResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.InstitutionMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InstitutionService {

    private final InstitutionRepository institutionRepository;
    private final InstitutionMapper institutionMapper;

    public InstitutionService(InstitutionRepository institutionRepository, InstitutionMapper institutionMapper){
        this.institutionRepository = institutionRepository;
        this.institutionMapper = institutionMapper;
    }

    @Transactional
    public InstitutionResponse create(InstitutionRequest request) {
        if (institutionRepository.existsByName(request.name())){
            throw new DuplicateResourceException("Institution", "name", request.name());
        }

        if (institutionRepository.existsByCnpj(request.cnpj())) {
            throw new DuplicateResourceException("Institution", "cnpj", request.cnpj());
        }

        Institution institution = institutionMapper.toEntity(request);
        Institution saved = institutionRepository.save(institution);

        return institutionMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public InstitutionResponse findById(Long id){
        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", id));

        return institutionMapper.toResponse(institution);
    }

    @Transactional(readOnly = true)
    public List<InstitutionResponse> findAll() {
        return institutionRepository.findAll()
                .stream()
                .map(institutionMapper::toResponse)
                .toList();
    }

    @Transactional
    public InstitutionResponse update(Long id, InstitutionRequest request) {
        Institution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", id));

        if (!institution.getName().equals(request.name()) && institutionRepository.existsByName(request.name())) {
            throw new DuplicateResourceException("Institution", "name", request.name());
        }

        if (!institution.getCnpj().equals(request.cnpj()) && institutionRepository.existsByCnpj(request.cnpj())) {
            throw new DuplicateResourceException("Institution", "cnpj", request.cnpj());
        }

        institution.setName(request.name());
        institution.setCnpj(request.cnpj());
        institution.setSubscriptionStatus(request.subscriptionStatus());
        institution.setExpiresAt(request.expiresAt());

        Institution updated = institutionRepository.save(institution);
        return institutionMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!institutionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Institution", id);
        }

        institutionRepository.deleteById(id);
    }
}
