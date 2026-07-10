package com.vinibarros.optisched.exception;

public class InvalidTimeSlotException extends RuntimeException {

    public InvalidTimeSlotException(){
        super("EndTime must be after StartTime.");
    }

    public InvalidTimeSlotException(String message) {
        super(message);
    }
}
