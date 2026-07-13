package com.vinibarros.optisched.exception;

public class OverlappingTimeSlotException extends RuntimeException {
    public OverlappingTimeSlotException(String message) {
        super(message);
    }
}
