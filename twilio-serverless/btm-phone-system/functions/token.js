'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  if (event.request && event.request.method === 'OPTIONS') {
    return callback(null, response);
  }

  const identity = event.identity || 'btm_properties_user';
  const { ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET, TWIML_APP_SID } = context;

  if (!ACCOUNT_SID || !API_KEY_SID || !API_KEY_SECRET || !TWIML_APP_SID) {
    response.setStatusCode(500);
    response.setBody({
      error: 'Missing required environment variables. Ensure ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET, and TWIML_APP_SID are configured.'
    });
    return callback(null, response);
  }

  try {
    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET, { identity });
    const grant = new VoiceGrant({
      outgoingApplicationSid: TWIML_APP_SID,
      incomingAllow: true
    });
    token.addGrant(grant);

    response.setBody({ token: token.toJwt(), identity });
    return callback(null, response);
  } catch (error) {
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
};
