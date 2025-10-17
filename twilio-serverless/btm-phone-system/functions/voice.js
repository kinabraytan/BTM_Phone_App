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

  if (event.To) {
    const dial = twiml.dial({ callerId });
    const to = event.To.trim();
    if (to.startsWith('client:')) {
      dial.client(to.replace('client:', ''));
    } else {
      dial.number(to);
    }
  } else {
    const dial = twiml.dial();
    dial.client(identity);
  }

  response.setBody(twiml.toString());
  return callback(null, response);
};
