package com.vinibarros.optisched.optimization;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.dto.optimization.OptimizationRequest;
import com.vinibarros.optisched.dto.optimization.OptimizationResponse;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

@Component
public class OptimizerClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OptimizerClient(RestClient restClient, ObjectMapper objectMapper){
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Retryable(
            retryFor = { ResourceAccessException.class, HttpServerErrorException.InternalServerError.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public OptimizationResponse optimize(OptimizationRequest request){
        try {
            return restClient.post().uri("/api/optimize").body(request).retrieve().body(OptimizationResponse.class);
        } catch (HttpClientErrorException.UnprocessableEntity e) {
            throw new InvalidScheduleException(
                    "The optimizer could not find a feasible schedule: " + extractDetail(e)
            );
        }
    }

    /**
     * FastAPI's HTTPException(detail=...) serializes to {"detail": "..."}.
     * Parsing that out gives Admins a readable message instead of a raw JSON
     * blob embedded in the exception text. Falls back to the raw body if it
     * isn't parseable JSON or has no "detail" field, so nothing is silently
     * lost.
     */
    private String extractDetail(HttpClientErrorException.UnprocessableEntity e) {
        String body = e.getResponseBodyAsString();
        try {
            JsonNode node = objectMapper.readTree(body);
            JsonNode detail = node.get("detail");
            if (detail != null && detail.isTextual()) {
                return detail.asText();
            }
        } catch (Exception parseError) {
            // Not parseable JSON — fall through and surface the raw body.
        }
        return body;
    }
}
