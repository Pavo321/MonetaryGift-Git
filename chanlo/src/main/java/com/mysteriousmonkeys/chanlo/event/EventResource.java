package com.mysteriousmonkeys.chanlo.event;

import com.mysteriousmonkeys.chanlo.dto.EventCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.EventResponse;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.QRCodeException;
import com.mysteriousmonkeys.chanlo.service.EventService;
import com.mysteriousmonkeys.chanlo.service.QRCodeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/chanla/events")
public class EventResource {
    
    private static final Logger log = LoggerFactory.getLogger(EventResource.class);
    
    @Autowired
    private EventService eventService;
    
    @Autowired
    private QRCodeService qrCodeService;

    @PostMapping
    public ResponseEntity<Event> createEvent(@Valid @RequestBody EventCreateRequest request) {
        Event event = eventService.createEvent(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(event.getEventId()).toUri();
        return ResponseEntity.created(location).body(event);
    }

    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        try {
            List<Event> events = eventService.getAllEvents();
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error fetching all events", e);
            throw e;
        }
    }

    @GetMapping("/{eventId}")
    public EventResponse getEvent(@PathVariable int eventId) {
        return eventService.getEventWithStats(eventId);
    }

    @GetMapping("/host/{hostId}")
    public List<Event> getEventsByHost(@PathVariable int hostId) {
        return eventService.getEventsByHost(hostId);
    }

    @GetMapping("/qr/{qrCodeData}")
    public Event getEventByQr(@PathVariable String qrCodeData) {
        return eventService.findByQrCode(qrCodeData);
    }

    /**
     * Generate QR code image for an event
     * GET /chanla/events/{eventId}/qr
     */
    @GetMapping("/{eventId}/qr")
    public ResponseEntity<byte[]> getEventQRCode(@PathVariable int eventId) {
        try {
            // Verify event exists - this will throw EventNotFoundException if not found
            eventService.getEventWithStats(eventId);
            
            // Generate QR code with event data
            String qrData = "EVENT_" + eventId;
            byte[] qrImage = qrCodeService.generateQRCodeImage(qrData);
            
            return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Content-Disposition", "inline; filename=event_" + eventId + "_qr.png")
                .body(qrImage);
                
        } catch (EventNotFoundException e) {
            // Let GlobalExceptionHandler handle this (returns 404)
            throw e;
        } catch (Exception e) {
            // Wrap any other exception in QRCodeException (returns 400)
            throw new QRCodeException("Failed to generate QR code for event " + eventId, e);
        }
    }

    /**
     * Decode QR code from image URL and return the associated event
     * POST /chanla/events/decode-qr?imageUrl={url}
     */
    @PostMapping("/decode-qr")
    public ResponseEntity<Event> decodeQRCode(@RequestParam String imageUrl) {
        try {
            // Decode the QR code from the image URL
            String qrData = qrCodeService.decodeQRCodeFromUrl(imageUrl);
            
            // Find the event with this QR code data
            Event event = eventService.findByQrCode(qrData);
            
            return ResponseEntity.ok(event);
            
        } catch (EventNotFoundException e) {
            // Let GlobalExceptionHandler handle this (returns 404)
            throw e;
        } catch (Exception e) {
            // Wrap any other exception in QRCodeException (returns 400)
            throw new QRCodeException("Failed to decode QR code from image URL", e);
        }
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<Event> updateEvent(
        @PathVariable int eventId, 
        @Valid @RequestBody EventCreateRequest request) {
        Event updated = eventService.updateEvent(eventId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable int eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }
}
