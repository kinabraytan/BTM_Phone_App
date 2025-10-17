'use strict';

/* eslint-env node */
/* global Twilio, exports */

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  if (event.request && event.request.method === 'OPTIONS') {
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();

    const [calls, messages] = await Promise.all([
      client.calls.list({ pageSize: 20 }),
      client.messages.list({ pageSize: 20 })
    ]);

    const normalizeCall = call => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration
    });

    const normalizeMessage = message => ({
      sid: message.sid,
      from: message.from,
      to: message.to,
      status: message.status,
      direction: message.direction,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      body: message.body
    });

    response.setBody({
      calls: calls.map(normalizeCall),
      messages: messages.map(normalizeMessage)
    });
    return callback(null, response);
  } catch (error) {
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
};
