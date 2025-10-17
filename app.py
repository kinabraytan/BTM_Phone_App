import os
from flask import Flask, request, render_template, jsonify
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.twiml.messaging_response import MessagingResponse
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)

# Setup logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler("app.log"),
                        logging.StreamHandler()
                    ])

# Initialize Twilio Client
try:
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    twilio_phone_number = os.environ["TWILIO_PHONE_NUMBER"]
    # The TWILIO_APP_SID is crucial for the softphone to work.
    # The user will need to create a TwiML App in the Twilio Console
    # and set its Voice URL to https://<your-ngrok-url>/voice
    twilio_app_sid = os.environ.get("TWILIO_APP_SID")
    client = Client(account_sid, auth_token)
    logging.info("Twilio client initialized successfully.")
except KeyError as e:
    logging.error(f"Missing a required Twilio credential in .env file: {e}")
    client = None

@app.route('/')
def index():
    # The number can be pre-filled from a URL parameter, e.g., /?number=+1234567890
    number_to_dial = request.args.get('number', '')
    return render_template('index.html', number_to_dial=number_to_dial)

@app.route('/token', methods=['GET'])
def get_token():
    """Generate a Twilio JWT capability token."""
    if not twilio_app_sid:
        logging.error("TWILIO_APP_SID is not configured in .env file.")
        return jsonify({"error": "Voice application not configured."}), 500

    # The identity can be a username, user ID, or any unique identifier
    identity = "btm_properties_user"

    access_token = AccessToken(account_sid, auth_token, twilio_app_sid, identity=identity)

    # Grant permissions for the token
    voice_grant = VoiceGrant(
        outgoing_application_sid=twilio_app_sid,
        incoming_allow=True, # Allow incoming calls
    )
    access_token.add_grant(voice_grant)

    # Return the token as JSON
    return jsonify(token=access_token.to_jwt())

@app.route("/voice", methods=['POST'])
def voice():
    """This endpoint provides TwiML instructions for handling calls."""
    resp = VoiceResponse()

    # The 'To' parameter will be present for outgoing calls from the browser client
    if "To" in request.form:
        # This is an outgoing call from our softphone
        dial = Dial(caller_id=twilio_phone_number)
        # The target number is passed in the 'To' parameter
        dial.number(request.form["To"])
        resp.append(dial)
    else:
        # This is an incoming call to our Twilio number
        # We can forward it to our browser client
        dial = Dial()
        # The client identity must match the one used to generate the token
        dial.client("btm_properties_user")
        resp.append(dial)

    return str(resp)

@app.route("/sms", methods=['POST'])
def sms():
    """Respond to incoming SMS messages."""
    from_number = request.form.get('From')
    body = request.form.get('Body', '')
    logging.info(f"Incoming SMS from {from_number}: {body}")

    resp = MessagingResponse()
    # A simple auto-reply
    resp.message("Thank you for your message. A BTM Properties representative will be with you shortly.")

    return str(resp)

if __name__ == '__main__':
    # Use port 5001 to avoid conflicts with other common development ports
    app.run(debug=True, port=5001)
