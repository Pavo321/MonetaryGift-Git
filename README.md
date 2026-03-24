# Mahotsava — Monetary Gift Management System

A full-stack platform for managing monetary gifts at Indian events (weddings, ceremonies, etc.). Hosts manage events and helpers through a mobile app, while guests interact entirely via WhatsApp.

---

## Features

### Host (Mobile App)
- Create and manage events
- Add helpers and assign them to events
- View real-time gift collection stats — Cash and UPI separately
- Accept gifts directly from in-person guests
- View per-helper summaries (cash collected, UPI collected, amount to hand back)
- Transaction history and guest records

### Helper (Mobile App)
- Collect gifts from guests by scanning their QR code
- Record cash or UPI payments
- Track expenses (only cash balance can be spent; UPI goes directly to host)
- View collection summary per event

### Guest (WhatsApp Chatbot)
- Register via WhatsApp (name, place)
- Get a personal QR code for use at the event
- Add family members without WhatsApp
- Edit personal details
- View transaction history
- All interactions through a guided chatbot menu

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3, Hibernate, Flyway |
| Database | MySQL |
| Mobile App | React Native (TypeScript) |
| WhatsApp | WhatsApp Cloud API (Meta Business) |
| Auth | JWT |
| Build | Maven |

---

## Project Structure

```
chanlo/
├── src/                        # Spring Boot backend
│   ├── main/java/              # Java source
│   │   └── com/mysteriousmonkeys/chanlo/
│   │       ├── dashboard/      # REST controllers
│   │       ├── event/          # Event entity & repository
│   │       ├── money/          # Hisab (gift records), expenses, settlements
│   │       ├── service/        # Business logic
│   │       ├── user/           # User entity & repository
│   │       └── whatsapp/       # Webhook & chatbot
│   └── main/resources/
│       ├── application.properties
│       └── db/migration/       # Flyway SQL migrations
└── Mahotsava/                  # React Native mobile app
    └── src/
        ├── screens/
        │   ├── host/           # Host screens
        │   └── helper/         # Helper screens
        ├── services/           # API client
        └── theme/              # Colors, spacing, typography
```

---

## Getting Started

### Prerequisites
- Java 17+
- Maven 3.8+
- MySQL 8+
- Node.js 18+
- React Native CLI
- Android Studio / Xcode

### Backend Setup

1. Create a MySQL database:
```sql
CREATE DATABASE Userdb;
CREATE USER 'chanlo_db'@'localhost' IDENTIFIED BY 'chanlo_secret';
GRANT ALL PRIVILEGES ON Userdb.* TO 'chanlo_db'@'localhost';
```

2. Set environment variables:
```bash
export WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
export WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
export WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

3. Run the backend:
```bash
cd chanlo
mvn spring-boot:run
```

### Mobile App Setup

```bash
cd chanlo/Mahotsava
npm install
npx react-native run-android   # or run-ios
```

### WhatsApp Webhook

Use [ngrok](https://ngrok.com) to expose your local server:
```bash
ngrok http 8080
```
Set the webhook URL in Meta Developer Console to:
```
https://<ngrok-url>/webhook
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token for webhook verification |
| `DB_URL` | MySQL JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `DASHBOARD_BASE_URL` | Frontend base URL for magic links |

---

## License

Private repository — all rights reserved.
