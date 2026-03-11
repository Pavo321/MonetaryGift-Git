package com.mysteriousmonkeys.chanlo.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.persistence.PersistenceException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.transaction.TransactionSystemException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        log.error("User not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("USER_NOT_FOUND", ex.getMessage()));
    }
    
    @ExceptionHandler(EventNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEventNotFound(EventNotFoundException ex) {
        log.error("Event not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("EVENT_NOT_FOUND", ex.getMessage()));
    }
    
    @ExceptionHandler(HisabNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleHisabNotFound(HisabNotFoundException ex) {
        log.error("Hisab not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("HISAB_NOT_FOUND", ex.getMessage()));
    }
    
    @ExceptionHandler(DuplicatePhoneNumberException.class)
    public ResponseEntity<ErrorResponse> handleDuplicatePhone(DuplicatePhoneNumberException ex) {
        log.error("Duplicate phone number: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("DUPLICATE_PHONE", ex.getMessage()));
    }
    
    @ExceptionHandler(QRCodeException.class)
    public ResponseEntity<ErrorResponse> handleQRCodeError(QRCodeException ex) {
        log.error("QR Code error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("QR_CODE_ERROR", ex.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> {
                String field = error.getField();
                String msg = error.getDefaultMessage();
                // Map to user-friendly messages
                if ("eventDate".equals(field) && msg != null && msg.contains("future")) {
                    return "Event date must be today or a future date.";
                }
                if ("eventName".equals(field) && msg != null && msg.contains("null")) {
                    return "Event name is required.";
                }
                if ("eventDate".equals(field) && msg != null && msg.contains("null")) {
                    return "Event date is required.";
                }
                return msg;
            })
            .collect(Collectors.joining(" "));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_ERROR", errors));
    }
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("Data integrity violation: ", ex);
        String message = extractRootCauseMessage(ex);
        
        // Check for CHECK constraint violations first
        if (message != null && (message.contains("CHECK constraint") || message.contains("chk_phone_format") || message.contains("chk_role"))) {
            if (message.contains("chk_phone_format")) {
                message = "Phone number must be exactly 10 digits (0-9)";
            } else if (message.contains("chk_role")) {
                message = "Role must be either 'GUEST' or 'ORGANIZER'";
            } else {
                message = "Data violates database constraint: " + message;
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("CONSTRAINT_VIOLATION", message));
        }
        
        // Check if it's a unique constraint violation
        if (message != null && message.contains("phone_number")) {
            message = "Phone number already exists";
        } else if (message != null && message.contains("Duplicate entry")) {
            message = "Duplicate entry: Phone number already exists";
        } else if (message != null && message.contains("could not execute statement")) {
            // Extract more specific error from root cause
            Throwable rootCause = ex.getRootCause();
            if (rootCause != null && rootCause.getMessage() != null) {
                String rootMessage = rootCause.getMessage();
                if (rootMessage.contains("phone_number") || rootMessage.contains("Duplicate")) {
                    message = "Phone number already exists";
                } else if (rootMessage.contains("CHECK") || rootMessage.contains("chk_")) {
                    if (rootMessage.contains("chk_phone_format")) {
                        message = "Phone number must be exactly 10 digits (0-9)";
                    } else {
                        message = "Data violates database constraint: " + rootMessage;
                    }
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("CONSTRAINT_VIOLATION", message));
                } else {
                    message = "Database constraint violation: " + rootMessage;
                }
            } else {
                message = "Database constraint violation occurred";
            }
        }
        
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("DATA_INTEGRITY_VIOLATION", message));
    }
    
    @ExceptionHandler(PersistenceException.class)
    public ResponseEntity<ErrorResponse> handlePersistenceException(PersistenceException ex) {
        log.error("Persistence exception: ", ex);
        String message = extractRootCauseMessage(ex);
        
        // Check for CHECK constraint violations
        if (message != null && (message.contains("CHECK constraint") || message.contains("chk_phone_format") || message.contains("chk_role"))) {
            if (message.contains("chk_phone_format")) {
                message = "Phone number must be exactly 10 digits (0-9)";
            } else if (message.contains("chk_role")) {
                message = "Role must be either 'GUEST' or 'ORGANIZER'";
            } else {
                message = "Data violates database constraint: " + message;
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("CONSTRAINT_VIOLATION", message));
        }
        
        if (message != null && message.contains("could not execute statement")) {
            Throwable rootCause = ex.getCause();
            if (rootCause != null && rootCause.getMessage() != null) {
                String rootMessage = rootCause.getMessage();
                if (rootMessage.contains("CHECK") || rootMessage.contains("chk_")) {
                    if (rootMessage.contains("chk_phone_format")) {
                        message = "Phone number must be exactly 10 digits (0-9)";
                    } else {
                        message = "Data violates database constraint: " + rootMessage;
                    }
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("CONSTRAINT_VIOLATION", message));
                }
                message = "Database error: " + rootMessage;
            } else {
                message = "Database operation failed";
            }
        }
        
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("PERSISTENCE_ERROR", message != null ? message : "Database operation failed"));
    }
    
    private String extractRootCauseMessage(Exception ex) {
        Throwable cause = ex.getCause();
        while (cause != null && cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause != null ? cause.getMessage() : ex.getMessage();
    }
    
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        log.error("Constraint violation: {}", ex.getMessage());
        String errors = ex.getConstraintViolations()
            .stream()
            .map(v -> {
                String field = v.getPropertyPath().toString();
                String msg = v.getMessage();
                // Return user-friendly messages
                if (field.contains("eventDate")) {
                    return "Event date must be today or a future date.";
                }
                return field + ": " + msg;
            })
            .collect(Collectors.joining(", "));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_ERROR", errors));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ErrorResponse> handleTransactionException(TransactionSystemException ex) {
        log.error("Transaction exception: ", ex);
        Throwable cause = ex.getRootCause();
        if (cause instanceof ConstraintViolationException cve) {
            return handleConstraintViolation(cve);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_ERROR", "Validation failed. Please check your input."));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Runtime exception: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error: ", ex);
        String message = extractRootCauseMessage(ex);
        
        // Check for CHECK constraint violations even in generic handler
        if (message != null && (message.contains("CHECK constraint") || message.contains("chk_phone_format") || message.contains("chk_role"))) {
            if (message.contains("chk_phone_format")) {
                message = "Phone number must be exactly 10 digits (0-9). Please ensure the phone number contains only digits and is exactly 10 characters long.";
            } else if (message.contains("chk_role")) {
                message = "Role must be either 'GUEST' or 'ORGANIZER'";
            } else {
                message = "Data violates database constraint: " + message;
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("CONSTRAINT_VIOLATION", message));
        }
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "Something went wrong. Please try again later."));
    }
}

