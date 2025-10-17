'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = function(context, event, callback) {
  const twiml = new Twilio.twiml.MessagingResponse();
  twiml.message('Thank you for contacting BTM Properties. A team member will get back to you shortly.');
  return callback(null, twiml);
};
