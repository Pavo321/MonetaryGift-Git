# WhatsApp Bot API Documentation

Base URL: `http://localhost:8080/whatsapp`

All users are identified by **10-digit mobile numbers** (e.g., `9876543210`)

---

## User Flow

1. **User chooses**: Host Event OR Pay to Event
2. **Host**: Can only see their own events
3. **Host Access**: Limited to name, amount, village of payers (privacy-focused)

---

## Endpoints

### 1. Create or Get User

**URL:** `POST /whatsapp/user?phoneNumber={phone}&name={name}&village={village}`

**Description:** Creates a new user or returns existing user by phone number

**Parameters:**
- `phoneNumber` (required): 10-digit mobile number (e.g., `9876543210`)
- `name` (required): User's name
- `village` (optional): User's village/city

**Example:**
```
POST /whatsapp/user?phoneNumber=9876543210&name=Rahul%20Sharma&village=Mumbai
```

**Response:**
```json
{
  "id": 1,
  "name": "Rahul Sharma",
  "village": "Mumbai",
  "phoneNumber": "9876543210",
  "role": "GUEST",
  "createdAt": "2025-12-19T10:00:00"
}
```

---

### 2. Create Event (Host)

**URL:** `POST /whatsapp/event`

**Description:** Create a new wedding event. Host must exist (will be auto-promoted to ORGANIZER)

**Request Body:**
```json
{
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "hostPhoneNumber": "9876543210",
  "thankYouMessage": "Thank you for blessing our wedding!"
}
```

**Field Requirements:**
- `eventName` (required): Name of the event
- `eventDate` (required): Future date in `YYYY-MM-DD` format
- `hostPhoneNumber` (required): 10-digit phone of host (must exist)
- `thankYouMessage` (optional): Custom message (defaults if not provided)

**Response:**
```json
{
  "eventId": 1,
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "qrCodeData": "EVENT_1",
  "status": "ACTIVE",
  "host": { ... }
}
```

---

### 3. Get Host's Events

**URL:** `GET /whatsapp/events?phoneNumber={phone}`

**Description:** Get all events hosted by a specific phone number

**Example:**
```
GET /whatsapp/events?phoneNumber=9876543210
```

**Response:**
```json
[
  {
    "eventId": 1,
    "eventName": "Priya & Rahul Wedding",
    "eventDate": "2025-12-25",
    "status": "ACTIVE",
    ...
  }
]
```

---

### 4. Get Event Summary with Payments (Host Only)

**URL:** `GET /whatsapp/event/{eventId}?phoneNumber={hostPhone}`

**Description:** Get event details with payment summary. **Only shows limited data: name, amount, village, status**

**Authorization:** Host phone must match event owner

**Example:**
```
GET /whatsapp/event/1?phoneNumber=9876543210
```

**Response:**
```json
{
  "eventId": 1,
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "totalAmount": 15000,
  "totalGifts": 3,
  "payments": [
    {
      "guestName": "Amit Patel",
      "amount": 5000,
      "village": "Delhi",
      "paymentStatus": "SUCCESS"
    },
    {
      "guestName": "Sneha Kumar",
      "amount": 10000,
      "village": "Mumbai",
      "paymentStatus": "SUCCESS"
    }
  ]
}
```

**Note:** Host can only see:
- ✅ Guest name
- ✅ Amount paid
- ✅ Village
- ✅ Payment status
- ❌ Phone numbers (hidden for privacy)
- ❌ Other personal details (hidden)

---

### 5. Create Payment (Guest)

**URL:** `POST /whatsapp/payment`

**Description:** Create a payment/gift record. Guest can pay using QR code

**Request Body:**
```json
{
  "eventQrCode": "EVENT_1",
  "guestPhoneNumber": "9123456789",
  "amount": 5000,
  "paymentMethod": "UPI_QR"
}
```

**Field Requirements:**
- `eventQrCode` (required): QR code data (e.g., `"EVENT_1"`)
- `guestPhoneNumber` (required): 10-digit phone of guest (must exist)
- `amount` (required): Payment amount (positive number)
- `paymentMethod` (optional): One of:
  - `"UPI_QR"`
  - `"UPI_COLLECT"`
  - `"PAYMENT_LINK"`
  - `"WHATSAPP_NATIVE"`
  - `"MANUAL"`

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

---

### 6. Get Event QR Code (Host Only)

**URL:** `GET /whatsapp/event/{eventId}/qr?phoneNumber={hostPhone}`

**Description:** Get QR code data for an event (host only)

**Authorization:** Host phone must match event owner

**Example:**
```
GET /whatsapp/event/1/qr?phoneNumber=9876543210
```

**Response:**
```
EVENT_1
```

---

## Complete WhatsApp Bot Flow

### Scenario 1: Host Creates Event

1. **User Registration:**
   ```
   POST /whatsapp/user?phoneNumber=9876543210&name=Priya&village=Mumbai
   ```

2. **Create Event:**
   ```json
   POST /whatsapp/event
   {
     "eventName": "Priya & Rahul Wedding",
     "eventDate": "2025-12-25",
     "hostPhoneNumber": "9876543210"
   }
   ```

3. **Get QR Code:**
   ```
   GET /whatsapp/event/1/qr?phoneNumber=9876543210
   Response: "EVENT_1"
   ```

4. **View Payments:**
   ```
   GET /whatsapp/event/1?phoneNumber=9876543210
   ```

### Scenario 2: Guest Pays to Event

1. **User Registration:**
   ```
   POST /whatsapp/user?phoneNumber=9123456789&name=Amit&village=Delhi
   ```

2. **Create Payment (using QR code):**
   ```json
   POST /whatsapp/payment
   {
     "eventQrCode": "EVENT_1",
     "guestPhoneNumber": "9123456789",
     "amount": 5000,
     "paymentMethod": "UPI_QR"
   }
   ```

---

## Security & Privacy

✅ **Host Authorization:**
- Hosts can only access their own events
- Phone number verification ensures data isolation

✅ **Limited Data Access:**
- Hosts see only: name, amount, village, status
- Phone numbers and other personal data are hidden

✅ **10-Digit Phone Validation:**
- All phone numbers must be exactly 10 digits
- Format: `9876543210` (no country code, no +)

---

## Error Responses

All endpoints return standard error format:
```json
{
  "code": "ERROR_CODE",
  "message": "Error description",
  "timestamp": "2025-12-19T10:00:00"
}
```

**Common Error Codes:**
- `USER_NOT_FOUND` - Phone number not registered
- `EVENT_NOT_FOUND` - Event doesn't exist or access denied
- `DUPLICATE_PHONE` - Phone number already exists
- `VALIDATION_ERROR` - Invalid request data

---

## WhatsApp Bot Integration Tips

1. **Phone Number Format:**
   - Always use 10-digit format: `9876543210`
   - No country code, no +, no spaces

2. **User Flow:**
   - Ask: "Do you want to host an event or pay to an event?"
   - For hosts: Collect name, village, event details
   - For guests: Collect name, village, QR code, amount

3. **QR Code Handling:**
   - QR codes are simple strings: `EVENT_1`, `EVENT_2`, etc.
   - Guests scan QR code → get `EVENT_1` → use in payment request

4. **Privacy:**
   - Hosts only see limited data (name, amount, village)
   - Never expose phone numbers to hosts
   - Each host can only see their own events

