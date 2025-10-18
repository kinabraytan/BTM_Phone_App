'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');

  const twiml = new Twilio.twiml.VoiceResponse();
  const identity = 'btm_properties_user';
  const callerId = context.TWILIO_PHONE_NUMBER;

  if (!callerId) {
    twiml.say('Caller ID is not configured. Please contact your administrator.');
    response.setBody(twiml.toString());
    return callback(null, response);
  }

  const toRaw = (event.To || '').trim();
  const normalizeNumber = (value) => (value || '').replace(/[^\d]/g, '');
  const toNormalized = normalizeNumber(toRaw);
  const callerIdNormalized = normalizeNumber(callerId);

  if (!toNormalized || toNormalized === callerIdNormalized) {
    const dial = twiml.dial({ callerId: event.From || callerId });
    dial.client(identity);
  } else {
    const dial = twiml.dial({ callerId });
    if (toRaw.startsWith('client:')) {
      dial.client(toRaw.replace('client:', ''));
    } else {
      dial.number(toRaw);
    }
  }

  response.setBody(twiml.toString());
  return callback(null, response);
};
