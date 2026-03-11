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
import java.awt.*;
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

        // Convert to RGB BufferedImage (WhatsApp rejects 1-bit grayscale PNGs)
        BufferedImage qrImage = new BufferedImage(QR_CODE_SIZE, QR_CODE_SIZE, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < QR_CODE_SIZE; x++) {
            for (int y = 0; y < QR_CODE_SIZE; y++) {
                qrImage.setRGB(x, y, bitMatrix.get(x, y) ? 0xFF000000 : 0xFFFFFFFF);
            }
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(qrImage, QR_CODE_FORMAT, outputStream);

        log.info("Successfully generated QR code with size {}x{} (RGB PNG)", QR_CODE_SIZE, QR_CODE_SIZE);
        return outputStream.toByteArray();
    }
    
    /**
     * Generates a branded QR code image with event name at top and date at bottom.
     * The QR code contains a WhatsApp deep link so scanning opens the chat directly.
     *
     * @param qrData    The data to encode (e.g., WhatsApp deep link)
     * @param eventName The event name to display at the top
     * @param eventDate The event date to display at the bottom
     * @return byte array of branded PNG image
     */
    public byte[] generateBrandedQRCodeImage(String qrData, String eventName, String eventDate) throws Exception {
        log.info("Generating branded QR code for event: {}", eventName);

        int qrSize = 400;
        int padding = 40;
        int topTextHeight = 70;
        int bottomTextHeight = 50;
        int canvasWidth = qrSize + (padding * 2);
        int canvasHeight = topTextHeight + qrSize + bottomTextHeight + (padding * 2);

        // Generate QR code
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(qrData, BarcodeFormat.QR_CODE, qrSize, qrSize);
        BufferedImage qrImage = MatrixToImageWriter.toBufferedImage(bitMatrix);

        // Create branded canvas
        BufferedImage canvas = new BufferedImage(canvasWidth, canvasHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = canvas.createGraphics();

        // Enable anti-aliasing
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // White background
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw event name at top (centered, bold)
        g.setColor(new Color(51, 51, 51));
        Font titleFont = new Font("SansSerif", Font.BOLD, 22);
        g.setFont(titleFont);
        FontMetrics titleMetrics = g.getFontMetrics();

        // Word-wrap event name if too long
        String displayName = eventName;
        if (titleMetrics.stringWidth(displayName) > canvasWidth - 40) {
            // Truncate with ellipsis
            while (titleMetrics.stringWidth(displayName + "...") > canvasWidth - 40 && displayName.length() > 10) {
                displayName = displayName.substring(0, displayName.length() - 1);
            }
            displayName = displayName + "...";
        }
        int titleX = (canvasWidth - titleMetrics.stringWidth(displayName)) / 2;
        int titleY = padding + titleMetrics.getAscent();
        g.drawString(displayName, titleX, titleY);

        // Draw "Scan to Gift" subtitle
        Font subtitleFont = new Font("SansSerif", Font.PLAIN, 14);
        g.setFont(subtitleFont);
        g.setColor(new Color(120, 120, 120));
        FontMetrics subMetrics = g.getFontMetrics();
        String subtitle = "Scan to Gift";
        int subX = (canvasWidth - subMetrics.stringWidth(subtitle)) / 2;
        g.drawString(subtitle, subX, titleY + 25);

        // Draw QR code
        int qrX = padding;
        int qrY = padding + topTextHeight;
        g.drawImage(qrImage, qrX, qrY, null);

        // Draw event date at bottom (centered)
        Font dateFont = new Font("SansSerif", Font.PLAIN, 16);
        g.setFont(dateFont);
        g.setColor(new Color(100, 100, 100));
        FontMetrics dateMetrics = g.getFontMetrics();
        int dateX = (canvasWidth - dateMetrics.stringWidth(eventDate)) / 2;
        int dateY = qrY + qrSize + padding / 2 + dateMetrics.getAscent();
        g.drawString(eventDate, dateX, dateY);

        // Draw border
        g.setColor(new Color(200, 200, 200));
        g.setStroke(new BasicStroke(2));
        g.drawRoundRect(5, 5, canvasWidth - 10, canvasHeight - 10, 20, 20);

        g.dispose();

        // Write to PNG
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(canvas, "PNG", out);

        log.info("Successfully generated branded QR code for: {}", eventName);
        return out.toByteArray();
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

