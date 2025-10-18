'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  const domain = context.DOMAIN_NAME || event?.request?.headers?.host;
  const location = domain ? `https://${domain}/index.html` : '/index.html';

  response.setStatusCode(302);
  response.appendHeader('Location', location);
  response.appendHeader('Cache-Control', 'no-store');

  return callback(null, response);
};
