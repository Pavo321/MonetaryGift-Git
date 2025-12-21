package com.mysteriousmonkeys.chanlo.exception;

/**
 * Exception thrown when QR code generation or decoding fails
 */
public class QRCodeException extends RuntimeException {
    
    public QRCodeException(String message) {
        super(message);
    }
    
    public QRCodeException(String message, Throwable cause) {
        super(message, cause);
    }
}

