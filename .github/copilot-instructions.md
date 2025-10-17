# 1BTM Properties Twilio App - AI Coding Instructions

## Project Overview
This is a web-based phone application using Twilio for voice and SMS communications. The primary goal is to create a functional web interface that can operate like a phone. Users will initiate calls by clicking specially formatted links in an external spreadsheet, which will open this web app.

The active deployment target is a Twilio Serverless (Functions + Assets) project located under `twilio-serverless/btm-phone-system`. The legacy Flask app is still available for local experimentation but is no longer the primary delivery path.

## Architecture & Key Components

### Core Services
- **Twilio Serverless Functions**: `/token`, `/voice`, `/send-sms`, `/logs`, and `/incoming-sms` power the softphone, TwiML responses, SMS sending, and recent activity feed.
- **Static Assets**: Hosted UI in `assets/index.html` with supporting CSS/JS under `assets/static/` (Voice JS SDK client lives in `app.js`).
- **Legacy Flask App**: `app.py` remains for reference/local testing but should not be expanded unless explicitly requested.

### Data Flow
1. A user clicks a link in a spreadsheet (e.g., `https://your-app-url/call?number=+15551234567`).
2. The Twilio-hosted UI (`assets/index.html`) loads, pre-filling the dialer and SMS form with the query number.
3. The user clicks "Call" or "Send SMS" in the UI (`assets/static/app.js`).
4. The frontend requests a Voice Access Token from `/token` and places a call via the Twilio Voice JS SDK, or posts to `/send-sms` for messaging.
5. Functions invoke Twilio REST APIs; `/voice` returns TwiML to bridge calls, `/incoming-sms` replies to inbound texts.
6. `/logs` aggregates recent call/message activity for display.

## Development Workflow

### Setup & Dependencies
- Install the Twilio CLI along with the Serverless plugin.
- Copy `twilio-serverless/btm-phone-system/.env.example` to `.env` in the same folder and populate it.
- Legacy Flask app tooling (virtualenv, `pip install -r requirements.txt`) is optional and only needed for local debugging of `app.py`.

### Environment Configuration
- Serverless `.env` requires: `ACCOUNT_SID`, `AUTH_TOKEN`, `API_KEY_SID`, `API_KEY_SECRET`, `TWILIO_PHONE_NUMBER`, and `TWIML_APP_SID`.
- API keys should be standard Voice-capable keys (not project tokens). The Auth Token is only used by `context.getTwilioClient()`.
- Keep the `.env` file local; never commit credentials.

## Code Patterns & Conventions

### Twilio Integration
- Serverless handlers should lean on `Twilio.Response`, `context.getTwilioClient()`, and TwiML helpers.
- Frontend uses the Voice JS SDK (`Twilio.Device`) and fetches tokens from `/token`.
- All phone numbers should be in E.164 format.

### Logging
- `/logs` currently reads from Twilio's REST APIs; no database is used. Surface critical errors via HTTP responses and console logs.
- The legacy Flask logger still writes to `app.log` but is not part of the hosted workflow.

## Important Notes for AI Agents
- **No Database**: This project does not use a traditional database. Contact data is managed externally in a spreadsheet.
- **Focus on Communication**: The core features are calling and messaging. UI development should support these actions.
- **Credentials**: Remind the user to set up Twilio credentials.
- **Deployment**: Use `npm run deploy:dev` or an equivalent Twilio CLI command from `twilio-serverless/btm-phone-system` to publish updates. Validate the hosted assets after each deploy.
---

*This file will be updated as the codebase develops. Focus on the Twilio integration and the Flask web interface.*