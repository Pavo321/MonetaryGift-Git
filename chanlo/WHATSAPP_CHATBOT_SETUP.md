# WhatsApp Chatbot Setup Guide

This guide explains how to set up and use the WhatsApp Business API chatbot integration.

## Overview

The WhatsApp chatbot allows users to interact with your Chanlo application via WhatsApp. Users can:
- Create events
- Make payments to events
- View their events and payment summaries
- Get help and information

## Prerequisites

1. **WhatsApp Business Account**
   - Register at [developers.facebook.com](https://developers.facebook.com)
   - Create a WhatsApp Business App
   - Get your credentials:
     - Phone Number ID
     - Business Account ID
     - Access Token
     - Webhook Verify Token (create a secure random string)

2. **Public HTTPS Endpoint**
   - WhatsApp requires a publicly accessible HTTPS endpoint
   - Deploy your Spring Boot application to:
     - AWS (EC2, Elastic Beanstalk, ECS)
     - Heroku
     - DigitalOcean
     - Google Cloud Platform
     - Any cloud provider with HTTPS support

## Configuration

### 1. Environment Variables

Set the following environment variables (or add to `application.properties`):

```properties
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_random_token
```

### 2. Webhook Configuration in Facebook Developer Console

1. Go to your WhatsApp Business App in Facebook Developer Console
2. Navigate to **Configuration** → **Webhooks**
3. Click **Edit** or **Add Webhook**
4. Set the **Callback URL**: `https://your-domain.com/webhook`
5. Set the **Verify Token**: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
6. Subscribe to the following webhook fields:
   - `messages`
   - `message_status`

## Architecture

### Components

1. **WhatsAppWebhookController** (`/webhook`)
   - `GET /webhook` - Webhook verification endpoint
   - `POST /webhook` - Receives incoming messages from WhatsApp

2. **ChatbotService**
   - Processes incoming messages
   - Manages conversation state
   - Generates responses based on user queries
   - Integrates with EventService, UserService, and HisabService

3. **WhatsAppApiService**
   - Sends messages back to users via WhatsApp Cloud API
   - Formats phone numbers to international format

### Message Flow

```
User sends message → WhatsApp Cloud API → Webhook (POST /webhook)
                                              ↓
                                    ChatbotService.processMessage()
                                              ↓
                                    Query Database (if needed)
                                              ↓
                                    Generate Response
                                              ↓
                                    WhatsAppApiService.sendTextMessage()
                                              ↓
                                    WhatsApp Cloud API → User receives message
```

## User Commands

### Basic Commands

- **`hi` / `hello`** - Welcome message and menu
- **`help`** - Show available commands
- **`host`** - Start creating a new event
- **`pay`** - Start making a payment to an event
- **`my events`** - List all your events
- **`event <QR_CODE>`** - View details of a specific event

### Creating an Event (Host Flow)

1. User types: `host`
2. Bot asks for name → User provides name
3. Bot asks for village → User provides village (or "skip")
4. Bot asks for event name → User provides event name
5. Bot asks for event date → User provides date (YYYY-MM-DD)
6. Bot asks for UPI ID → User provides UPI ID
7. Bot asks for thank you message → User provides message (or "skip")
8. Bot creates event and returns QR code

### Making a Payment (Guest Flow)

1. User types: `pay`
2. Bot asks for QR code → User provides QR code (e.g., "EVENT_1")
3. Bot shows event details and asks for name → User provides name
4. Bot asks for village → User provides village (or "skip")
5. Bot asks for amount → User provides amount
6. Bot creates payment record and shows UPI ID for payment

## Testing

### Local Testing with ngrok

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
# Then run:
ngrok http 8080

# Use the HTTPS URL in webhook configuration:
# https://your-ngrok-url.ngrok.io/webhook
```

### Testing Webhook Verification

```bash
curl "http://localhost:8080/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test123"
```

Expected response: `test123`

### Testing Message Handling

Send a test message from WhatsApp to your registered number. The bot should respond automatically.

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Deploy application to cloud provider
- [ ] Configure HTTPS/SSL certificate
- [ ] Set webhook URL in Facebook Developer Console
- [ ] Verify webhook (should return challenge)
- [ ] Test sending a message from WhatsApp
- [ ] Monitor logs for errors

## Troubleshooting

### Webhook Verification Fails

- Check that `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches the token in Facebook Console
- Ensure the endpoint is publicly accessible
- Check server logs for errors

### Messages Not Received

- Verify webhook is subscribed to `messages` field
- Check that phone number is registered in WhatsApp Business Account
- Verify access token is valid and has necessary permissions
- Check application logs for errors

### Messages Not Sent

- Verify `WHATSAPP_ACCESS_TOKEN` is valid
- Check `WHATSAPP_PHONE_NUMBER_ID` is correct
- Ensure phone number format is correct (international format)
- Check API rate limits

### Database Errors

- Verify database connection is configured
- Check that Flyway migrations have run
- Ensure user/event tables exist

## Security Considerations

1. **Webhook Verify Token**: Use a strong, random token
2. **Access Token**: Keep it secure, never commit to version control
3. **HTTPS**: Always use HTTPS for webhook endpoint
4. **Input Validation**: All user inputs are validated
5. **Rate Limiting**: Consider implementing rate limiting for production

## API Endpoints

### Webhook Endpoints

- `GET /webhook` - Webhook verification
- `POST /webhook` - Receive messages

### Existing WhatsApp REST Endpoints

The existing `/whatsapp/*` endpoints remain available for direct API calls:
- `POST /whatsapp/user` - Create/get user
- `POST /whatsapp/event` - Create event
- `GET /whatsapp/events` - Get host events
- `GET /whatsapp/event/{id}` - Get event details
- `POST /whatsapp/payment` - Create payment
- etc.

## Next Steps

1. **Enhanced NLP**: Consider integrating with NLP services for better message understanding
2. **Rich Media**: Add support for images, documents, and interactive buttons
3. **Payment Gateway Integration**: Direct payment processing via WhatsApp
4. **Multi-language Support**: Support for multiple languages
5. **Analytics**: Track user interactions and popular commands

## Support

For issues or questions:
- Check application logs
- Review Facebook Developer Console for webhook status
- Verify all configuration values are correct

