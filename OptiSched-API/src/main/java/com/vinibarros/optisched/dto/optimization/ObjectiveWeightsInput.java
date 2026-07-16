package com.vinibarros.optisched.dto.optimization;

public record ObjectiveWeightsInput(
        Double alpha,
        Double beta,
        Double gamma,
        Double delta
) {
    public static ObjectiveWeightsInput defaults() {
        return new ObjectiveWeightsInput(1.0, 1.0, 1.0, 1.0);
    }
}