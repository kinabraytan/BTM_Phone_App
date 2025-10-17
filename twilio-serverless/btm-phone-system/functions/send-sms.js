'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  if (event.request && event.request.method === 'OPTIONS') {
    return callback(null, response);
  }

  const to = (event.to || '').trim();
  const body = (event.body || '').trim();

  if (!to || !body) {
    response.setStatusCode(400);
    response.setBody({ error: 'Both "to" and "body" parameters are required.' });
    return callback(null, response);
  }

  const from = context.TWILIO_PHONE_NUMBER;
  if (!from) {
    response.setStatusCode(500);
    response.setBody({ error: 'TWILIO_PHONE_NUMBER is not configured.' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const message = await client.messages.create({ to, from, body });
    response.setBody({ sid: message.sid, status: message.status });
    return callback(null, response);
  } catch (error) {
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
};
