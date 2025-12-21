# WhatsApp Bot Flow - Complete Guide

## Overview

This document describes the complete user flow for the WhatsApp bot integration with UPI payment support.

---

## User Flow

### 1. Host Creates Event

**Step 1: User Registration (if not exists)**
```
POST /whatsapp/user?phoneNumber=9876543210&name=Priya&village=Mumbai
```

**Step 2: Create Event with UPI ID**
```json
POST /whatsapp/event
{
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "hostPhoneNumber": "9876543210",
  "hostUpiId": "priya@paytm",
  "thankYouMessage": "Thank you for blessing our wedding!"
}
```

**Response:**
```json
{
  "eventId": 1,
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "qrCodeData": "EVENT_1",
  "hostUpiId": "priya@paytm",
  "status": "ACTIVE"
}
```

**Step 3: Get QR Code**
```
GET /whatsapp/event/1/qr?phoneNumber=9876543210
Response: "EVENT_1"
```

---

### 2. Guest Pays to Event

**Step 1: Guest Scans QR Code**
```
GET /whatsapp/scan/EVENT_1
```

**Response:**
```json
{
  "eventId": 1,
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "hostName": "Priya",
  "hostUpiId": "priya@paytm",
  "thankYouMessage": "Thank you for blessing our wedding!"
}
```

**WhatsApp Bot Action:**
- Display event details to guest
- Show host UPI ID: `priya@paytm`
- Ask guest to enter:
  - Name
  - Village (optional)
  - Phone number
  - Amount

**Step 2: Guest Enters Payment Details**

WhatsApp collects:
- Name: "Amit Patel"
- Village: "Delhi"
- Phone: "9123456789"
- Amount: 5000

**Step 3: Create Payment**
```json
POST /whatsapp/payment
{
  "eventQrCode": "EVENT_1",
  "guestName": "Amit Patel",
  "guestVillage": "Delhi",
  "guestPhoneNumber": "9123456789",
  "amount": 5000,
  "paymentMethod": "UPI_QR"
}
```

**Response:**
```json
{
  "hisabId": 1,
  "event": { ... },
  "guest": { ... },
  "amount": 5000,
  "paymentStatus": "PENDING",
  "paymentMethod": "UPI_QR"
}
```

**Step 4: WhatsApp Confirms Payment**

After guest completes payment via UPI:
```
POST /whatsapp/payment/1/confirm?transactionId=TXN123456789&gatewayName=PhonePe
```

**Response:**
```json
{
  "hisabId": 1,
  "amount": 5000,
  "paymentStatus": "SUCCESS",
  "gatewayTransactionId": "TXN123456789",
  "gatewayName": "PhonePe",
  "completedAt": "2025-12-19T10:30:00"
}
```

---

## Complete API Endpoints

### Host Endpoints

1. **Create/Get User**
   ```
   POST /whatsapp/user?phoneNumber={phone}&name={name}&village={village}
   ```

2. **Create Event**
   ```
   POST /whatsapp/event
   Body: { eventName, eventDate, hostPhoneNumber, hostUpiId, thankYouMessage }
   ```

3. **Get Host's Events**
   ```
   GET /whatsapp/events?phoneNumber={phone}
   ```

4. **Get Event Summary (with payments)**
   ```
   GET /whatsapp/event/{eventId}?phoneNumber={phone}
   ```

5. **Get QR Code**
   ```
   GET /whatsapp/event/{eventId}/qr?phoneNumber={phone}
   ```

### Guest Endpoints

1. **Scan QR Code**
   ```
   GET /whatsapp/scan/{qrCode}
   Returns: Event details including host UPI ID
   ```

2. **Create Payment**
   ```
   POST /whatsapp/payment
   Body: { eventQrCode, guestName, guestVillage, guestPhoneNumber, amount, paymentMethod }
   ```

3. **Confirm Payment**
   ```
   POST /whatsapp/payment/{hisabId}/confirm?transactionId={id}&gatewayName={name}
   ```

---

## WhatsApp Bot Conversation Flow

### Host Flow

```
Bot: Welcome! Do you want to host an event or pay to an event?
User: Host event

Bot: Please enter your name
User: Priya

Bot: Please enter your village (optional)
User: Mumbai

Bot: Please enter your phone number
User: 9876543210

Bot: Please enter event name
User: Priya & Rahul Wedding

Bot: Please enter event date (YYYY-MM-DD)
User: 2025-12-25

Bot: Please enter your UPI ID
User: priya@paytm

Bot: Event created! Your QR code is: EVENT_1
     Share this QR code with your guests.
```

### Guest Flow

```
Bot: Welcome! Do you want to host an event or pay to an event?
User: Pay to event

Bot: Please scan the QR code or enter QR code
User: [Scans QR] or [Enters: EVENT_1]

Bot: Event Details:
     Event: Priya & Rahul Wedding
     Date: 2025-12-25
     Host: Priya
     UPI ID: priya@paytm
     
     Please pay to: priya@paytm
     
     Please enter your name
User: Amit Patel

Bot: Please enter your village (optional)
User: Delhi

Bot: Please enter your phone number
User: 9123456789

Bot: Please enter the amount
User: 5000

Bot: Payment created! Please complete the payment to: priya@paytm
     Amount: ₹5000
     
     [After payment completion]
     
Bot: Payment confirmed! Thank you for your gift.
```

---

## Data Privacy

✅ **Host can only see:**
- Guest name
- Amount paid
- Village
- Payment status

❌ **Host cannot see:**
- Guest phone numbers
- Other personal details

✅ **Security:**
- Hosts can only access their own events
- Phone number verification ensures data isolation

---

## UPI ID Format

UPI IDs can be in various formats:
- `username@paytm`
- `username@ybl` (PhonePe)
- `username@okaxis` (Axis Bank)
- `username@upi` (Generic)
- `phone@upi` (Phone number based)

The system accepts any string as UPI ID and displays it to guests for payment.

---

## Error Handling

**If QR code not found:**
```json
{
  "code": "EVENT_NOT_FOUND",
  "message": "Event not found for QR: EVENT_999"
}
```

**If payment confirmation fails:**
```json
{
  "code": "HISAB_NOT_FOUND",
  "message": "Payment record not found"
}
```

---

## Example Complete Flow

### 1. Host Setup
```bash
# Register host
POST /whatsapp/user?phoneNumber=9876543210&name=Priya&village=Mumbai

# Create event
POST /whatsapp/event
{
  "eventName": "Wedding",
  "eventDate": "2025-12-25",
  "hostPhoneNumber": "9876543210",
  "hostUpiId": "priya@paytm"
}

# Get QR code
GET /whatsapp/event/1/qr?phoneNumber=9876543210
# Returns: "EVENT_1"
```

### 2. Guest Payment
```bash
# Scan QR code
GET /whatsapp/scan/EVENT_1
# Returns event details with UPI ID

# Create payment
POST /whatsapp/payment
{
  "eventQrCode": "EVENT_1",
  "guestName": "Amit",
  "guestVillage": "Delhi",
  "guestPhoneNumber": "9123456789",
  "amount": 5000,
  "paymentMethod": "UPI_QR"
}

# Confirm payment (after UPI payment)
POST /whatsapp/payment/1/confirm?transactionId=TXN123&gatewayName=PhonePe
```

### 3. Host Views Payments
```bash
# Get event summary
GET /whatsapp/event/1?phoneNumber=9876543210
# Returns: Event with payment list (name, amount, village only)
```

