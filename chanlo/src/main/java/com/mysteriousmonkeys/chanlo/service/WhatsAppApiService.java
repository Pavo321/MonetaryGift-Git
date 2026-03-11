package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.WhatsAppMessageRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Service to interact with WhatsApp Cloud API
 */
@Service
public class WhatsAppApiService {
    
    private static final Logger log = LoggerFactory.getLogger(WhatsAppApiService.class);
    
    @Value("${whatsapp.phone.number.id}")
    private String phoneNumberId;
    
    @Value("${whatsapp.access.token}")
    private String accessToken;
    
    @Value("${whatsapp.api.url}")
    private String apiUrl;
    
    private final RestTemplate restTemplate;
    
    public WhatsAppApiService() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * Send a text message to a WhatsApp number
     * @param to Phone number in international format (e.g., 919876543210)
     * @param message Text message to send
     * @return true if sent successfully, false otherwise
     */
    public boolean sendTextMessage(String to, String message) {
        try {
            // Ensure phone number is in international format (add country code if needed)
            String formattedTo = formatPhoneNumber(to);
            
            String url = apiUrl + "/" + phoneNumberId + "/messages";
            
            WhatsAppMessageRequest request = WhatsAppMessageRequest.createTextMessage(formattedTo, message);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            
            HttpEntity<WhatsAppMessageRequest> entity = new HttpEntity<>(request, headers);
            
            log.info("Sending WhatsApp message to: {}", formattedTo);
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Message sent successfully to: {}", formattedTo);
                return true;
            } else {
                log.error("Failed to send message. Status: {}, Response: {}", 
                    response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception e) {
            log.error("Error sending WhatsApp message to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Send a document (e.g., Excel file) to a WhatsApp number.
     * Uploads the file first, then sends it as a document message.
     */
    public boolean sendDocument(String to, byte[] fileBytes, String filename) {
        try {
            String formattedTo = formatPhoneNumber(to);

            // Step 1: Upload media and get file_id
            String mediaId = uploadMedia(fileBytes, filename);
            if (mediaId == null) {
                log.error("Media upload failed for document: {}", filename);
                return false;
            }

            // Step 2: Send document message
            String url = apiUrl + "/" + phoneNumberId + "/messages";

            Map<String, Object> documentMap = new HashMap<>();
            documentMap.put("id", mediaId);
            documentMap.put("filename", filename);

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", formattedTo);
            body.put("type", "document");
            body.put("document", documentMap);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Document sent successfully to: {}", formattedTo);
                return true;
            } else {
                log.error("Failed to send document. Status: {}, Response: {}", response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception e) {
            log.error("Error sending document to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Send an image to a WhatsApp number.
     * Uploads the image first, then sends it as an image message.
     */
    public boolean sendImage(String to, byte[] imageBytes, String filename, String caption) {
        try {
            String formattedTo = formatPhoneNumber(to);

            String mediaId = uploadMedia(imageBytes, filename, MediaType.IMAGE_PNG);
            if (mediaId == null) {
                log.error("Image upload failed for: {}", filename);
                return false;
            }

            String url = apiUrl + "/" + phoneNumberId + "/messages";

            Map<String, Object> imageMap = new HashMap<>();
            imageMap.put("id", mediaId);
            if (caption != null) {
                imageMap.put("caption", caption);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", formattedTo);
            body.put("type", "image");
            body.put("image", imageMap);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            log.info("Sending image message: to={}, mediaId={}, body={}", formattedTo, mediaId, body);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.info("Image send response: status={}, body={}", response.getStatusCode(), response.getBody());
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Image sent successfully to: {}", formattedTo);
                return true;
            } else {
                log.error("Failed to send image. Status: {}, Response: {}", response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception e) {
            log.error("Error sending image to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Send an image to a WhatsApp number using a publicly accessible URL.
     * WhatsApp servers will fetch the image from the URL.
     * This avoids the media upload API entirely.
     */
    public boolean sendImageByUrl(String to, String imageUrl, String caption) {
        try {
            String formattedTo = formatPhoneNumber(to);
            String url = apiUrl + "/" + phoneNumberId + "/messages";

            Map<String, Object> imageMap = new HashMap<>();
            imageMap.put("link", imageUrl);
            if (caption != null) {
                imageMap.put("caption", caption);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", formattedTo);
            body.put("type", "image");
            body.put("image", imageMap);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            log.info("Sending image by URL: to={}, url={}", formattedTo, imageUrl);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.info("Image-by-URL response: status={}, body={}", response.getStatusCode(), response.getBody());
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Image sent by URL successfully to: {}", formattedTo);
                return true;
            } else {
                log.error("Failed to send image by URL. Status: {}, Response: {}", response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception e) {
            log.error("Error sending image by URL to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Upload a file to WhatsApp Media API and return the media file_id.
     */
    private String uploadMedia(byte[] fileBytes, String filename, MediaType contentType) {
        try {
            String url = apiUrl + "/" + phoneNumberId + "/media";

            // Use ByteArrayResource with proper filename for multipart upload
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            // Wrap the file part with explicit Content-Type header
            // Without this, Spring defaults to application/octet-stream which WhatsApp rejects
            HttpHeaders filePartHeaders = new HttpHeaders();
            filePartHeaders.setContentType(contentType);
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, filePartHeaders);

            LinkedMultiValueMap<String, Object> multipartBody = new LinkedMultiValueMap<>();
            multipartBody.add("file", filePart);
            multipartBody.add("type", contentType.toString());
            multipartBody.add("messaging_product", "whatsapp");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(accessToken);

            HttpEntity<LinkedMultiValueMap<String, Object>> entity = new HttpEntity<>(multipartBody, headers);
            log.info("Uploading media: filename={}, contentType={}, size={} bytes", filename, contentType, fileBytes.length);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Media upload response body: {}", response.getBody());
                Object idObj = response.getBody().get("id");
                String fileId = idObj != null ? idObj.toString() : null;
                log.info("Media uploaded successfully, id: {}", fileId);
                return fileId;
            }
            log.error("Media upload failed. Status: {}, Response: {}", response.getStatusCode(), response.getBody());
            return null;
        } catch (Exception e) {
            log.error("Error uploading media: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Upload a file (backwards compatible - defaults to Excel content type)
     */
    private String uploadMedia(byte[] fileBytes, String filename) {
        return uploadMedia(fileBytes, filename, MediaType.valueOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    /**
     * Format phone number to international format
     * Assumes 10-digit numbers are Indian (+91)
     */
    private String formatPhoneNumber(String phoneNumber) {
        // Remove any non-digit characters
        String digits = phoneNumber.replaceAll("[^0-9]", "");
        
        // If it's 10 digits, assume it's Indian and add +91
        if (digits.length() == 10) {
            return "91" + digits;
        }
        
        // If it already starts with country code, return as is
        if (digits.length() > 10) {
            return digits;
        }
        
        // Default: return as is
        return digits;
    }
}

