package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.request.InstitutionRequest;
import com.vinibarros.optisched.dto.response.InstitutionResponse;
import com.vinibarros.optisched.entity.Institution;
import org.springframework.stereotype.Component;

import java.text.Normalizer;

@Component
public class InstitutionMapper {

    public Institution toEntity(InstitutionRequest request) {
        Institution institution = new Institution();

        institution.setName(request.name());
        institution.setSlug(slugify(request.name()));
        institution.setCnpj(request.cnpj());
        institution.setSubscriptionStatus(request.subscriptionStatus());
        institution.setExpiresAt(request.expiresAt());

        return institution;
    }

    private String slugify(String input) {
        String withoutAccents = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return withoutAccents.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    public InstitutionResponse toResponse(Institution institution){
        return new InstitutionResponse(
                institution.getId(),
                institution.getName(),
                institution.getCnpj(),
                institution.getSubscriptionStatus(),
                institution.getExpiresAt()
        );
    }
}
