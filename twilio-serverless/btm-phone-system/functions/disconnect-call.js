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

  const callSid = (event.callSid || event.CallSid || '').trim();

  if (!callSid) {
    response.setStatusCode(400);
    response.setBody({ error: 'Parameter "callSid" is required.' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const call = await client.calls(callSid).update({ status: 'completed' });
    response.setBody({ success: true, callSid: call.sid, status: call.status });
    return callback(null, response);
  } catch (error) {
    if (error.code === 20404) {
      response.setBody({ success: true, callSid, status: 'completed', note: 'Call already completed.' });
      return callback(null, response);
    }
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
};
