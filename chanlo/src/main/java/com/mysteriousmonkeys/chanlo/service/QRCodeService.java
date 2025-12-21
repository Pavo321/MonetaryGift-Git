package com.mysteriousmonkeys.chanlo.service;

import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;

@Service
public class QRCodeService {
    
    private static final Logger log = LoggerFactory.getLogger(QRCodeService.class);
    private static final int QR_CODE_SIZE = 300;
    private static final String QR_CODE_FORMAT = "PNG";
    
    /**
     * Generates a QR code image from the given data string
     * @param data The text to encode in the QR code (e.g., "EVENT_1")
     * @return byte array of PNG image
     * @throws Exception if QR code generation fails
     */
    public byte[] generateQRCodeImage(String data) throws Exception {
        log.info("Generating QR code for data: {}", data);
        
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(
            data, 
            BarcodeFormat.QR_CODE, 
            QR_CODE_SIZE, 
            QR_CODE_SIZE
        );
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, QR_CODE_FORMAT, outputStream);
        
        log.info("Successfully generated QR code with size {}x{}", QR_CODE_SIZE, QR_CODE_SIZE);
        return outputStream.toByteArray();
    }
    
    /**
     * Decodes a QR code from a BufferedImage
     * @param qrCodeImage The image containing the QR code
     * @return The decoded text from the QR code
     * @throws Exception if decoding fails
     */
    public String decodeQRCode(BufferedImage qrCodeImage) throws Exception {
        log.info("Decoding QR code from BufferedImage");
        
        BinaryBitmap binaryBitmap = new BinaryBitmap(
            new HybridBinarizer(
                new BufferedImageLuminanceSource(qrCodeImage)
            )
        );
        
        Result result = new MultiFormatReader().decode(binaryBitmap);
        String decodedText = result.getText();
        
        log.info("Successfully decoded QR code: {}", decodedText);
        return decodedText;
    }
    
    /**
     * Decodes a QR code from an image URL
     * @param imageUrl The URL of the image containing the QR code
     * @return The decoded text from the QR code
     * @throws Exception if URL is invalid or decoding fails
     */
    public String decodeQRCodeFromUrl(String imageUrl) throws Exception {
        log.info("Decoding QR code from URL: {}", imageUrl);
        
        // Use URI.toURL() to avoid deprecation warning
        URI uri = new URI(imageUrl);
        BufferedImage image = ImageIO.read(uri.toURL());
        
        if (image == null) {
            throw new IllegalArgumentException("Could not read image from URL: " + imageUrl);
        }
        
        return decodeQRCode(image);
    }
}

