package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.dto.GuestUpiPaymentRequest;
import com.mysteriousmonkeys.chanlo.dto.HisabCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.dto.UpiPaymentLinkResponse;
import com.mysteriousmonkeys.chanlo.service.HisabService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/chanla/hisab")
public class HisabResource {
    
    @Autowired
    private HisabService hisabService;

    @PostMapping
    public ResponseEntity<Hisab> createHisab(@Valid @RequestBody HisabCreateRequest request) {
        Hisab hisab = hisabService.createHisab(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(hisab.getHisabId()).toUri();
        return ResponseEntity.created(location).body(hisab);
    }

    @GetMapping
    public List<HisabResponse> getAllHisabs() {
        return hisabService.getAllHisabs();
    }

    @GetMapping("/event/{eventId}")
    public List<HisabResponse> getHisabsByEvent(@PathVariable int eventId) {
        return hisabService.getHisabsByEvent(eventId);
    }

    @GetMapping("/guest/{guestId}")
    public List<HisabResponse> getHisabsByGuest(@PathVariable int guestId) {
        return hisabService.getHisabsByGuest(guestId);
    }

    @PostMapping("/{hisabId}/success")
    public ResponseEntity<Hisab> markSuccess(
        @PathVariable int hisabId,
        @RequestParam String transactionId,
        @RequestParam String gatewayName) {
        Hisab updated = hisabService.markPaymentSuccess(hisabId, transactionId, gatewayName);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{hisabId}/failed")
    public ResponseEntity<Hisab> markFailed(@PathVariable int hisabId) {
        Hisab updated = hisabService.markPaymentFailed(hisabId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Generate UPI deep links for guest to pay directly
     *
     * This endpoint:
     * 1. Takes guest details and event QR code
     * 2. Creates a pending payment record
     * 3. Returns clickable UPI links for all major UPI apps
     *
     * The guest can click any link to open their UPI app and pay directly to the host.
     *
     * Example request:
     * POST /chanla/hisab/payment-link
     * {
     *   "eventQrCode": "EVENT_1",
     *   "guestName": "John Doe",
     *   "guestVillage": "Mumbai",
     *   "guestPhoneNumber": "9876543210",
     *   "guestUpiId": "john@paytm",
     *   "amount": 5000
     * }
     */
    @PostMapping("/payment-link")
    public ResponseEntity<UpiPaymentLinkResponse> generatePaymentLink(
            @Valid @RequestBody GuestUpiPaymentRequest request) {
        UpiPaymentLinkResponse response = hisabService.generateUpiPaymentLinks(request);

        if (response.hisabId() == 0) {
            // Error case
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }
}
