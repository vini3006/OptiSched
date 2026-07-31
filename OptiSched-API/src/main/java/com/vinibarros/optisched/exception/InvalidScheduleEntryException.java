package com.vinibarros.optisched.exception;

public class InvalidScheduleEntryException extends RuntimeException {
    public InvalidScheduleEntryException(String message) {
        super(message);
    }
}
