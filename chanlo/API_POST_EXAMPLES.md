# API POST Endpoints - JSON Examples

Base URL: `http://localhost:8080`

---

## 1. Create User

**URL:** `POST /chanla/users`

**Description:** Create a new user (guest or organizer)

**Request Body:**
```json
{
  "name": "John Doe",
  "village": "Mumbai",
  "phoneNumber": "+919876543210",
  "role": "GUEST"
}
```

**Example - Guest:**
```json
{
  "name": "Rahul Sharma",
  "village": "Delhi",
  "phoneNumber": "+919876543210",
  "role": "GUEST"
}
```

**Example - Organizer:**
```json
{
  "name": "Priya Patel",
  "village": "Ahmedabad",
  "phoneNumber": "+919123456789",
  "role": "ORGANIZER"
}
```

**Field Requirements:**
- `name` (required): User's full name
- `village` (optional): User's village/city
- `phoneNumber` (required): Must start with `+` followed by country code and 10-14 digits (e.g., `+919876543210`)
- `role` (optional): Either `"GUEST"` or `"ORGANIZER"` (defaults to `"GUEST"` if not provided)

**Response:** Returns created User object with `id`

---

## 2. Create Event

**URL:** `POST /chanla/events`

**Description:** Create a new wedding event

**Request Body:**
```json
{
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "hostId": 1,
  "thankYouMessage": "Thank you for blessing our wedding!"
}
```

**Example - With Custom Thank You Message:**
```json
{
  "eventName": "Anjali & Vikram Wedding",
  "eventDate": "2026-01-15",
  "hostId": 2,
  "thankYouMessage": "Thank you for your love and blessings on our special day!"
}
```

**Example - Default Thank You Message:**
```json
{
  "eventName": "Sneha & Arjun Wedding",
  "eventDate": "2026-02-20",
  "hostId": 1
}
```

**Field Requirements:**
- `eventName` (required): Name of the wedding event
- `eventDate` (required): Must be a future date in format `YYYY-MM-DD`
- `hostId` (required): ID of the user who is hosting (must be an existing user)
- `thankYouMessage` (optional): Custom thank you message (max 500 characters). Defaults to "Thank you for blessing our wedding!" if not provided

**Response:** Returns created Event object with `eventId` and auto-generated `qrCodeData`

---

## 3. Create Hisab (Payment/Gift)

**URL:** `POST /chanla/hisab`

**Description:** Create a new payment/gift record for an event

**Request Body:**
```json
{
  "eventId": 1,
  "guestId": 3,
  "amount": 5000,
  "paymentMethod": "UPI_QR"
}
```

**Example - UPI Collect:**
```json
{
  "eventId": 1,
  "guestId": 4,
  "amount": 10000,
  "paymentMethod": "UPI_COLLECT"
}
```

**Example - Payment Link:**
```json
{
  "eventId": 1,
  "guestId": 5,
  "amount": 2500,
  "paymentMethod": "PAYMENT_LINK"
}
```

**Example - Manual Payment:**
```json
{
  "eventId": 1,
  "guestId": 6,
  "amount": 3000,
  "paymentMethod": "MANUAL"
}
```

**Field Requirements:**
- `eventId` (required): ID of the event (must exist)
- `guestId` (required): ID of the guest making the payment (must be an existing user)
- `amount` (required): Payment amount (must be positive number)
- `paymentMethod` (optional): One of:
  - `"UPI_QR"`
  - `"UPI_COLLECT"`
  - `"PAYMENT_LINK"`
  - `"WHATSAPP_NATIVE"`
  - `"MANUAL"`

**Response:** Returns created Hisab object with `hisabId` and `paymentStatus: "PENDING"`

---

## 4. Mark Payment as Success

**URL:** `POST /chanla/hisab/{hisabId}/success?transactionId={id}&gatewayName={name}`

**Description:** Mark a payment as successful after gateway confirmation

**Example:**
```
POST /chanla/hisab/1/success?transactionId=TXN123456789&gatewayName=PhonePe
```

**Query Parameters:**
- `transactionId` (required): Transaction ID from payment gateway
- `gatewayName` (required): Name of the payment gateway (e.g., "PhonePe", "Paytm", "GPay")

**Response:** Returns updated Hisab object with `paymentStatus: "SUCCESS"`

---

## 5. Mark Payment as Failed

**URL:** `POST /chanla/hisab/{hisabId}/failed`

**Description:** Mark a payment as failed

**Example:**
```
POST /chanla/hisab/1/failed
```

**Response:** Returns updated Hisab object with `paymentStatus: "FAILED"`

---

## 6. Decode QR Code

**URL:** `POST /chanla/events/decode-qr?imageUrl={url}`

**Description:** Decode a QR code from an image URL and find the associated event

**Example:**
```
POST /chanla/events/decode-qr?imageUrl=https://example.com/qr-code.png
```

**Query Parameters:**
- `imageUrl` (required): URL of the QR code image

**Response:** Returns the Event object associated with the decoded QR code

---

## Complete Workflow Example

### Step 1: Create Organizer User
```json
POST /chanla/users
{
  "name": "Priya Patel",
  "village": "Ahmedabad",
  "phoneNumber": "+919123456789",
  "role": "ORGANIZER"
}
```
**Response:** `{ "id": 1, ... }`

### Step 2: Create Event
```json
POST /chanla/events
{
  "eventName": "Priya & Rahul Wedding",
  "eventDate": "2025-12-25",
  "hostId": 1,
  "thankYouMessage": "Thank you for blessing our wedding!"
}
```
**Response:** `{ "eventId": 1, "qrCodeData": "EVENT_1", ... }`

### Step 3: Create Guest User
```json
POST /chanla/users
{
  "name": "Rahul Sharma",
  "village": "Delhi",
  "phoneNumber": "+919876543210",
  "role": "GUEST"
}
```
**Response:** `{ "id": 2, ... }`

### Step 4: Create Payment/Hisab
```json
POST /chanla/hisab
{
  "eventId": 1,
  "guestId": 2,
  "amount": 5000,
  "paymentMethod": "UPI_QR"
}
```
**Response:** `{ "hisabId": 1, "paymentStatus": "PENDING", ... }`

### Step 5: Mark Payment as Success (after gateway confirmation)
```
POST /chanla/hisab/1/success?transactionId=TXN123456789&gatewayName=PhonePe
```

---

## Common Headers

All POST requests should include:
```
Content-Type: application/json
```

## Error Responses

All endpoints return standard error format:
```json
{
  "code": "ERROR_CODE",
  "message": "Error description",
  "timestamp": "2025-12-19T03:03:32.184395758"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `USER_NOT_FOUND` - User ID doesn't exist
- `EVENT_NOT_FOUND` - Event ID doesn't exist
- `HISAB_NOT_FOUND` - Hisab ID doesn't exist
- `DUPLICATE_PHONE` - Phone number already exists
- `QR_CODE_ERROR` - QR code generation/decoding failed

