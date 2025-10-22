
# 1BTM Properties Twilio App — AI Coding Instructions

## Project Overview
This is a web-based phone and SMS app for BTM Properties, built around Twilio Serverless Functions and a browser UI. The main goal is to enable virtual assistants to call and text contacts from a spreadsheet, with all communications managed via the web interface.

## Architecture & Major Components
- **Twilio Serverless (Primary)**: All production logic lives in `twilio-serverless/btm-phone-system`.
	- **Functions**: `/token`, `/voice`, `/send-sms`, `/logs`, `/incoming-sms`, `/disconnect-call`, `/root-redirect`.
	- **Assets**: UI in `assets/index.html`, JS in `assets/static/app.js`, CSS in `assets/static/style.css`, Twilio SDK in `assets/static/vendor/twilio.min.js`.
- **Legacy Flask App (Secondary)**: `app.py` and `templates/` for local testing only. Do not expand unless explicitly requested.

## Data Flow & Integration
1. User clicks a spreadsheet link (e.g., `...?number=+15551234567`).
2. UI loads, pre-filling dialer/SMS fields.
3. User initiates call/SMS via UI (`app.js`).
4. Frontend fetches token from `/token`, calls via Twilio Voice JS SDK, or sends SMS via `/send-sms`.
5. Serverless functions use Twilio REST APIs; `/voice` returns TwiML, `/logs` aggregates recent activity.
6. No database—contacts managed externally.

## Developer Workflow
- **Setup**:
	- Install Twilio CLI + Serverless plugin.
	- Copy `.env.example` to `.env` in `twilio-serverless/btm-phone-system` and fill in credentials.
	- For Flask: `pip install -r requirements.txt` (optional).
- **Deploy**:
	- Use `npm run deploy:dev` or Twilio CLI to deploy serverless code and assets.
	- Validate UI and endpoints after each deploy.
- **Debug/Test**:
	- Use `/logs` endpoint for recent call/SMS activity (no DB).
	- Console logs and HTTP error responses surface issues.

## Project-Specific Patterns & Conventions
- **Twilio Integration**:
	- Use `Twilio.Response`, `context.getTwilioClient()`, TwiML helpers in serverless functions.
	- All phone numbers must be E.164 format.
	- Frontend uses `Twilio.Device` for calls, fetches tokens from `/token`.
- **Error Handling**:
	- Functions return structured error responses (JSON or TwiML).
	- Critical errors logged to console and surfaced in UI.
- **No Database**:
	- All logs and contacts are managed via Twilio APIs and external spreadsheets.
- **Environment Variables**:
	- Required: `ACCOUNT_SID`, `AUTH_TOKEN`, `API_KEY_SID`, `API_KEY_SECRET`, `TWILIO_PHONE_NUMBER`, `TWIML_APP_SID`.
	- Never commit `.env` files.

## Key Files & Directories
- `twilio-serverless/btm-phone-system/functions/` — All backend logic (see: `token.js`, `voice.js`, `send-sms.js`, `logs.js`, etc.)
- `twilio-serverless/btm-phone-system/assets/` — UI and static assets
- `app.py` — Legacy Flask app (local only)
- `templates/` — Flask HTML templates

## AI Agent Guidance
- Focus on Twilio integration and communication features.
- Do not add database code; contacts/logs are external.
- Always remind users to set up Twilio credentials.
- Use the Serverless project for all production changes.
- Validate UI and endpoints after deployment.

---
*Update this file as the codebase evolves. Document only actual, discoverable patterns—not aspirational practices.*