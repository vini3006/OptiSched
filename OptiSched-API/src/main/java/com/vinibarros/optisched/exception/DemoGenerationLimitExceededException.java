package com.vinibarros.optisched.exception;

public class DemoGenerationLimitExceededException extends RuntimeException {
    public DemoGenerationLimitExceededException(String message) {
        super(message);
    }
}
