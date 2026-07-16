package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.dto.optimization.OptimizationRequest;
import com.vinibarros.optisched.dto.optimization.OptimizationResponse;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class OptimizerClient {

    private final RestClient restClient;

    public OptimizerClient(RestClient restClient){
        this.restClient = restClient;
    }

    public OptimizationResponse optimize(OptimizationRequest request){
        try {
            return restClient.post().uri("/api/optimize").body(request).retrieve().body(OptimizationResponse.class);
        } catch (HttpClientErrorException.UnprocessableEntity e) {
            throw new InvalidScheduleException(
                    "The optimizer could not find a feasible schedule: " + e.getResponseBodyAsString()
            );
        }
    }
}
