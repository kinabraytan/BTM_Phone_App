
'use strict';

/* global Twilio */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    device: null,
    connection: null,
    muted: false,
    identity: null,
    activeCallSid: null,
    pendingConnection: null,
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
    workspace: document.getElementById('workspace'),
    viewToggle: document.getElementById('view-toggle'),
    recentNumbers: document.getElementById('recent-numbers'),
    openSmsButton: document.getElementById('open-sms-btn'),
    incomingBanner: document.getElementById('incoming-call-banner'),
    incomingFrom: document.getElementById('incoming-call-from'),
    incomingTo: document.getElementById('incoming-call-to'),
    answerButton: document.getElementById('answer-call'),
    rejectButton: document.getElementById('reject-call'),
  };

  refs.callButton.disabled = true;
  refs.callButton.title = 'Initializing voice device...';
  refs.muteButton.disabled = true;
  refs.muteButton.title = 'Mute call';

  const viewToggleButtons = refs.viewToggle ? Array.from(refs.viewToggle.querySelectorAll('button[data-view]')) : [];

  const setStatus = (text, statusClass) => {
    refs.statusText.textContent = text;
    refs.statusIndicator.className = `status-indicator ${statusClass}`;
  };

  const RECENTS_STORAGE_KEY = 'btm-phone-recents';

  const setActiveView = (view) => {
    if (!refs.workspace || !view) {
      return;
    }
    refs.workspace.dataset.activeView = view;
    viewToggleButtons.forEach((button) => {
      const isActive = button.dataset.view === view;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  if (refs.viewToggle) {
    refs.viewToggle.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (!button) {
        return;
      }
      setActiveView(button.dataset.view);
    });
  }

  setActiveView(refs.workspace ? refs.workspace.dataset.activeView || 'dialer' : 'dialer');

  const getStoredRecentNumbers = () => {
    try {
      const stored = localStorage.getItem(RECENTS_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch (error) {
      console.warn('Unable to parse stored recents', error);
      return [];
    }
  };

  let recentNumbers = getStoredRecentNumbers();

  const renderRecentNumbers = () => {
    if (!refs.recentNumbers) {
      return;
    }
    refs.recentNumbers.innerHTML = '';
    const fragment = document.createDocumentFragment();
    recentNumbers.forEach((number) => {
      const option = document.createElement('option');
      option.value = number;
      fragment.appendChild(option);
    });
    refs.recentNumbers.appendChild(fragment);
  };

  const rememberNumber = (rawNumber) => {
    const number = (rawNumber || '').trim();
    if (!number) {
      return;
    }
    recentNumbers = [number, ...recentNumbers.filter((item) => item !== number)].slice(0, 12);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recentNumbers));
    renderRecentNumbers();
  };

  renderRecentNumbers();

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
    rememberNumber(queryPrefill);
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

  function showIncomingCallBanner(connection) {
    if (!refs.incomingBanner) {
      return;
    }
    const from = connection?.parameters?.From || 'Unknown';
    const to = connection?.parameters?.To || '';
    if (refs.incomingFrom) {
      refs.incomingFrom.textContent = `From: ${from}`;
    }
    if (refs.incomingTo) {
      refs.incomingTo.textContent = to ? `To: ${to}` : '';
    }
    if (refs.answerButton) {
      refs.answerButton.disabled = false;
    }
    if (refs.rejectButton) {
      refs.rejectButton.disabled = false;
    }
    refs.incomingBanner.classList.add('active');
    refs.incomingBanner.setAttribute('aria-hidden', 'false');
    setStatus(`Incoming call from ${from}`, 'ringing');
  }

  function hideIncomingCallBanner() {
    if (!refs.incomingBanner) {
      return;
    }
    refs.incomingBanner.classList.remove('active');
    refs.incomingBanner.setAttribute('aria-hidden', 'true');
    if (refs.incomingFrom) {
      refs.incomingFrom.textContent = 'Unknown Caller';
    }
    if (refs.incomingTo) {
      refs.incomingTo.textContent = '';
    }
    if (refs.answerButton) {
      refs.answerButton.disabled = false;
    }
    if (refs.rejectButton) {
      refs.rejectButton.disabled = false;
    }
  }

  const resetCallUI = (statusText = 'Ready', statusClass = 'ready') => {
    state.connection = null;
    state.muted = false;
    state.activeCallSid = null;
    state.pendingConnection = null;
    hideIncomingCallBanner();
    refs.muteButton.classList.remove('muted');
    refs.muteButton.disabled = true;
    refs.muteButton.title = 'Mute call';
    const icon = refs.muteButton.querySelector('i');
    if (icon) {
      icon.classList.add('fa-microphone');
      icon.classList.remove('fa-microphone-slash');
    }
    refs.callButton.disabled = false;
    refs.callButton.title = 'Start a call';
    showInCallUI(false);
    const resolvedText = statusClass === 'ready' && state.identity && statusText.startsWith('Ready')
      ? `Ready — ${state.identity}`
      : statusText;
    setStatus(resolvedText, statusClass);
  };

  const bindConnectionLifecycle = (connection) => {
    if (!connection) {
      return;
    }

    if (connection._btmBound) {
      return;
    }
    Object.defineProperty(connection, '_btmBound', {
      value: true,
      enumerable: false,
      configurable: true,
      writable: false,
    });

    connection.on('accept', () => {
      state.activeCallSid = connection.parameters?.CallSid || state.activeCallSid;
      setStatus('On call', 'oncall');
      refs.muteButton.disabled = false;
      refs.muteButton.title = 'Mute call';
    });

    const endHandler = () => {
      state.activeCallSid = null;
      resetCallUI();
      logItem('call', `<strong>Call ended</strong><div class="meta"><span>${new Date().toLocaleTimeString()}</span></div>`);
      refreshLogs();
    };

    connection.on('disconnect', endHandler);
    connection.on('cancel', endHandler);
    connection.on('reject', endHandler);

    connection.on('error', (error) => {
      console.error('Connection error', error);
      resetCallUI(`Call failed: ${error.message}`, 'error');
    });
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
    if (typeof Twilio === 'undefined') {
      setStatus('Voice SDK failed to load', 'error');
      refs.callButton.title = 'Voice SDK unavailable';
      console.error('Twilio SDK is not available on window.');
      return;
    }
    try {
      setStatus('Requesting credentials...', 'ringing');
      const { token, identity } = await fetchToken();
      state.identity = identity;
      state.device = new Twilio.Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        debug: false,
        closeProtection: true,
      });

      const handleRegistered = () => {
        const label = state.identity ? `Ready — ${state.identity}` : 'Ready';
        resetCallUI(label, 'ready');
      };

      state.device.on('ready', handleRegistered);
      state.device.on('registered', handleRegistered);

      state.device.on('unregistered', () => {
        setStatus('Disconnected from Twilio', 'error');
        refs.callButton.disabled = true;
        refs.callButton.title = 'Voice client unavailable';
      });

      state.device.on('error', (error) => {
        console.error('Device error', error);
        setStatus(`Error: ${error.message}`, 'error');
        refs.callButton.disabled = true;
        refs.callButton.title = 'Voice client unavailable';
      });

      state.device.on('incoming', (connection) => {
        state.pendingConnection = connection;
        showIncomingCallBanner(connection);
        if (refs.numberDisplay) {
          refs.numberDisplay.value = (connection.parameters?.From || '').trim();
        }
        const cleanupPending = () => {
          if (state.pendingConnection === connection) {
            state.pendingConnection = null;
            hideIncomingCallBanner();
          }
        };
        connection.on('cancel', cleanupPending);
        connection.on('disconnect', cleanupPending);
        connection.on('reject', cleanupPending);
        connection.on('error', cleanupPending);
      });

      state.device.on('connect', (connection) => {
        state.connection = connection;
        state.activeCallSid = connection.parameters?.CallSid || null;
        showInCallUI(true);
        const target = connection.parameters.To || 'Unknown';
        setStatus(`Connected — ${target}`, 'oncall');
        logItem('call', `<strong>Connected</strong><div class="meta"><span>${target}</span><span>${new Date().toLocaleTimeString()}</span></div>`);
        refreshLogs();
        bindConnectionLifecycle(connection);
      });

      state.device.on('disconnect', () => {
        resetCallUI();
      });

      state.device.on('cancel', () => {
        resetCallUI();
      });

      state.device.on('tokenWillExpire', refreshToken);
      state.device.on('tokenExpired', refreshToken);

      setStatus('Connecting to Twilio...', 'ringing');
      await state.device.register();
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
      rememberNumber(number);
      refs.smsNumber.value = number;
      state.connection = state.device.connect({ params: { To: number } });
      showInCallUI(true);
      refs.muteButton.disabled = true;
    } catch (error) {
      console.error(error);
      setStatus(error.message, 'error');
      showInCallUI(false);
    }
  };

  const terminateBackendCall = async (callSid) => {
    if (!callSid) {
      return;
    }
    try {
      const payload = new URLSearchParams({ callSid });
      const response = await fetch('/disconnect-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        console.warn('Backend disconnect failed', detail.error || response.statusText);
      }
    } catch (error) {
      console.warn('Backend disconnect error', error);
    }
  };

  const hangup = async () => {
    if (state.device) {
      setStatus('Ending call...', 'ringing');
      const activeSid = state.activeCallSid || state.connection?.parameters?.CallSid || null;
      try {
        state.device.disconnectAll();
        if (activeSid) {
          await terminateBackendCall(activeSid);
        }
      } finally {
        resetCallUI();
      }
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
      rememberNumber(to);
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
  if (refs.openSmsButton) {
    refs.openSmsButton.addEventListener('click', () => {
      refs.smsNumber.value = refs.numberDisplay.value.trim();
      setActiveView('messaging');
    });
  }

  if (refs.answerButton) {
    refs.answerButton.addEventListener('click', () => {
      if (!state.pendingConnection) {
        return;
      }
      refs.answerButton.disabled = true;
      if (refs.rejectButton) {
        refs.rejectButton.disabled = true;
      }
      try {
        state.pendingConnection.accept();
        state.pendingConnection = null;
        hideIncomingCallBanner();
        setStatus('Connecting...', 'ringing');
      } catch (error) {
        console.error('Failed to accept call', error);
        resetCallUI(`Call failed: ${error.message}`, 'error');
      }
    });
  }

  if (refs.rejectButton) {
    refs.rejectButton.addEventListener('click', () => {
      if (!state.pendingConnection) {
        return;
      }
      try {
        state.pendingConnection.reject();
      } catch (error) {
        console.error('Failed to reject call', error);
      }
      state.pendingConnection = null;
      hideIncomingCallBanner();
      const label = state.identity ? `Ready — ${state.identity}` : 'Ready';
      setStatus(label, 'ready');
    });
  }

  if (refs.numberDisplay) {
    refs.numberDisplay.addEventListener('input', (event) => {
      const value = event.target.value.replace(/\s+/g, '');
      if (value !== event.target.value) {
        event.target.value = value;
      }
    });
  }

  initializeDevice();
  refreshLogs();
  setInterval(refreshLogs, 60_000);
});
