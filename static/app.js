document.addEventListener('DOMContentLoaded', () => {
    const callBtn = document.getElementById('call-btn');
    const smsBtn = document.getElementById('sms-btn');
    const numberInput = document.getElementById('number');
    const smsBody = document.getElementById('sms-body');
    const logList = document.getElementById('log-list');

    function log(message) {
        const li = document.createElement('li');
        li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logList.prepend(li);
    }

    callBtn.addEventListener('click', () => {
        const number = numberInput.value;
        if (!number) {
            alert('Please enter a number to call.');
            return;
        }
        log(`Initiating call to ${number}...`);
        fetch('/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number: number }),
        })
        .then(response => response.json())
        .then(data => {
            log(data.message);
        })
        .catch(error => {
            console.error('Error:', error);
            log(`Error calling ${number}.`);
        });
    });

    smsBtn.addEventListener('click', () => {
        const number = numberInput.value;
        const body = smsBody.value;
        if (!number || !body) {
            alert('Please enter a number and a message to send.');
            return;
        }
        log(`Sending SMS to ${number}...`);
        fetch('/sms-send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number: number, body: body }),
        })
        .then(response => response.json())
        .then(data => {
            log(data.message);
            smsBody.value = '';
        })
        .catch(error => {
            console.error('Error:', error);
            log(`Error sending SMS to ${number}.`);
        });
    });
});