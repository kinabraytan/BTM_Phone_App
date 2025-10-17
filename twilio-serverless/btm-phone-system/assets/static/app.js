
'use strict';

/* global Twilio */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    device: null,
    connection: null,
    muted: false,
    identity: null,
  };

  const refs = {
    numberDisplay: document.getElementById('number-display'),
    dialpad: document.getElementById('dialpad'),
    callButton: document.getElementById('call-btn'),
    hangupButton: document.getElementById('hangup-btn'),
    backspaceButton: document.getElementById('backspace-btn'),
    muteButton: document.getElementById('mute-btn'),
    incallControls: document.getElementById('incall-controls'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    smsNumber: document.getElementById('sms-number'),
    smsBody: document.getElementById('sms-body'),
    smsSend: document.getElementById('sms-send'),
    refreshLogs: document.getElementById('refresh-logs'),
    callLog: document.getElementById('call-log'),
    smsLog: document.getElementById('sms-log'),
  };

  refs.callButton.disabled = true;
  refs.muteButton.disabled = true;
  refs.muteButton.title = 'Mute call';

  const setStatus = (text, statusClass) => {
    refs.statusText.textContent = text;
    refs.statusIndicator.className = `status-indicator ${statusClass}`;
  };

  const refreshToken = async () => {
    try {
      setStatus('Refreshing credentials...', 'ringing');
      const { token, identity } = await fetchToken();
      if (state.device) {
        if (identity) {
          state.identity = identity;
        }
        await state.device.updateToken(token);
        const label = state.identity ? `Ready — ${state.identity}` : 'Ready';
        setStatus(label, 'ready');
      }
    } catch (error) {
      console.error('Token refresh error', error);
      setStatus(`Token refresh failed: ${error.message}`, 'error');
    }
  };

  const logItem = (type, body) => {
    const list = type === 'call' ? refs.callLog : refs.smsLog;
    const li = document.createElement('li');
    li.innerHTML = body;
    list.prepend(li);
  };

  const queryPrefill = new URLSearchParams(window.location.search).get('number');
  if (queryPrefill) {
    refs.numberDisplay.value = queryPrefill;
    refs.smsNumber.value = queryPrefill;
  }

  const appendDigit = (digit) => {
    refs.numberDisplay.value += digit;
  };

  const backspace = () => {
    refs.numberDisplay.value = refs.numberDisplay.value.slice(0, -1);
  };

  const showInCallUI = (inCall) => {
    refs.callButton.style.display = inCall ? 'none' : 'inline-flex';
    refs.hangupButton.style.display = inCall ? 'inline-flex' : 'none';
    refs.incallControls.style.display = inCall ? 'flex' : 'none';
    refs.dialpad.style.opacity = inCall ? 0.25 : 1;
    refs.dialpad.style.pointerEvents = inCall ? 'none' : 'initial';
  };

  const fetchToken = async () => {
    const identity = 'btm_properties_user';
    const response = await fetch(`/token?identity=${encodeURIComponent(identity)}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || 'Unable to fetch token');
    }
    return response.json();
  };

  const initializeDevice = async () => {
    try {
      setStatus('Requesting credentials...', 'ringing');
      const { token, identity } = await fetchToken();
      state.identity = identity;
      state.device = new Twilio.Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        debug: false,
        closeProtection: true,
      });

      state.device.on('ready', () => {
        setStatus(`Ready — ${identity}`, 'ready');
        refs.callButton.disabled = false;
      });

      state.device.on('error', (error) => {
        console.error('Device error', error);
        setStatus(`Error: ${error.message}`, 'error');
        refs.callButton.disabled = true;
      });

      state.device.on('incoming', (connection) => {
        setStatus(`Incoming call from ${connection.parameters.From}`, 'ringing');
        if (confirm(`Accept call from ${connection.parameters.From}?`)) {
          state.connection = connection;
          connection.accept();
        } else {
          connection.reject();
        }
      });

      state.device.on('connect', (connection) => {
        state.connection = connection;
        setStatus('On call', 'oncall');
        showInCallUI(true);
        refs.muteButton.disabled = false;
        refs.muteButton.title = 'Mute call';
        const icon = refs.muteButton.querySelector('i');
        if (icon) {
          icon.classList.add('fa-microphone');
          icon.classList.remove('fa-microphone-slash');
        }
        logItem('call', `<strong>Connected</strong><div class="meta"><span>${connection.parameters.To || 'Unknown'}</span><span>${new Date().toLocaleTimeString()}</span></div>`);
        refreshLogs();
      });

      state.device.on('disconnect', () => {
        state.connection = null;
        state.muted = false;
        refs.muteButton.classList.remove('muted');
        refs.muteButton.disabled = true;
        refs.callButton.disabled = false;
        refs.muteButton.title = 'Mute call';
        const icon = refs.muteButton.querySelector('i');
        if (icon) {
          icon.classList.add('fa-microphone');
          icon.classList.remove('fa-microphone-slash');
        }
        showInCallUI(false);
        setStatus('Ready', 'ready');
        logItem('call', `<strong>Call ended</strong><div class="meta"><span>${new Date().toLocaleTimeString()}</span></div>`);
        refreshLogs();
      });

      state.device.on('cancel', () => {
        setStatus('Ready', 'ready');
      });

      state.device.on('tokenWillExpire', refreshToken);
      state.device.on('tokenExpired', refreshToken);
    } catch (error) {
      console.error(error);
      setStatus(error.message, 'error');
    }
  };

  const makeCall = async () => {
    if (!state.device) {
      return alert('Device not ready yet.');
    }
    const number = refs.numberDisplay.value.trim();
    if (!number) {
      return alert('Enter a number to dial.');
    }

    setStatus(`Dialing ${number}...`, 'ringing');
    try {
      state.connection = state.device.connect({ params: { To: number } });
      showInCallUI(true);
      refs.muteButton.disabled = true;
    } catch (error) {
      console.error(error);
      setStatus(error.message, 'error');
      showInCallUI(false);
    }
  };

  const hangup = () => {
    if (state.device) {
      setStatus('Ending call...', 'ringing');
      state.device.disconnectAll();
    }
  };

  const toggleMute = () => {
    if (!state.connection) {
      return;
    }
    state.muted = !state.muted;
    state.connection.mute(state.muted);
    refs.muteButton.classList.toggle('muted', state.muted);
    refs.muteButton.title = state.muted ? 'Unmute call' : 'Mute call';
    const icon = refs.muteButton.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-microphone', !state.muted);
      icon.classList.toggle('fa-microphone-slash', state.muted);
    }
  };

  const sendSms = async () => {
    const to = refs.smsNumber.value.trim();
    const body = refs.smsBody.value.trim();
    if (!to || !body) {
      return alert('Provide both a recipient number and a message.');
    }
    try {
      const payload = new URLSearchParams({ to, body });
      const response = await fetch('/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || 'Failed to send SMS');
      }
      refs.smsBody.value = '';
      logItem('sms', `<strong>SMS sent</strong><div class="meta"><span>${to}</span><span>${new Date().toLocaleTimeString()}</span></div>`);
      refreshLogs();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const refreshLogs = async () => {
    try {
      const response = await fetch('/logs');
      if (!response.ok) {
        throw new Error('Unable to fetch logs');
      }
      const { calls, messages } = await response.json();

      const callItems = (calls || []).map((call) => {
        const time = call.startTime ? new Date(call.startTime).toLocaleString() : 'N/A';
        const direction = call.direction ? call.direction.replace('_', ' ') : 'unknown';
        return `<li><strong>${direction}</strong><div class="meta"><span>${call.from || 'Unknown'} → ${call.to || 'Unknown'}</span><span>${time}</span></div></li>`;
      });

      const smsItems = (messages || []).map((message) => {
        const time = message.dateCreated ? new Date(message.dateCreated).toLocaleString() : 'N/A';
        const direction = message.direction ? message.direction.replace('_', ' ') : 'unknown';
        return `<li><strong>${direction}</strong><div class="meta"><span>${message.from || 'Unknown'} → ${message.to || 'Unknown'}</span><span>${time}</span></div><div>${message.body || ''}</div></li>`;
      });

  refs.callLog.innerHTML = callItems.join('') || "<li class='empty'>No recent calls.</li>";
  refs.smsLog.innerHTML = smsItems.join('') || "<li class='empty'>No recent messages.</li>";
    } catch (error) {
      console.error(error);
    }
  };

  refs.dialpad.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-digit]');
    if (!button) {
      return;
    }
    appendDigit(button.dataset.digit);
  });

  refs.backspaceButton.addEventListener('click', backspace);
  refs.callButton.addEventListener('click', makeCall);
  refs.hangupButton.addEventListener('click', hangup);
  refs.muteButton.addEventListener('click', toggleMute);
  refs.smsSend.addEventListener('click', sendSms);
  refs.refreshLogs.addEventListener('click', refreshLogs);

  initializeDevice();
  refreshLogs();
  setInterval(refreshLogs, 60_000);
});
