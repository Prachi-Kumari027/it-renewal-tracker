const API_BASE = 'http://localhost:5000/api';

const recipientEmailEl     = document.getElementById('recipientEmail');
const addRecipientBtn      = document.getElementById('addRecipientBtn');
const recipientFormMessage = document.getElementById('recipientFormMessage');
const recipientsList       = document.getElementById('recipientsList');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientRowHTML(recipient) {
  return `
    <div class="recipient-row" data-recipient-id="${recipient.recipient_id}">
      <span>${recipient.email}</span>
      <button class="btn danger remove-recipient">Remove</button>
    </div>
  `;
}

async function loadRecipients() {
  try {
    const response = await fetch(`${API_BASE}/recipients`);
    const recipients = await response.json();

    if (recipients.length === 0) {
      recipientsList.innerHTML = `<p style="font-size:13px; color:#6b7684;">No recipients added yet.</p>`;
      return;
    }

    recipientsList.innerHTML = recipients.map(recipientRowHTML).join('');
  } catch (error) {
    recipientsList.innerHTML = `<p style="font-size:13px; color:#a33d33;">Could not load recipients. Is the backend running?</p>`;
    console.error('Error loading recipients:', error);
  }
}

async function addRecipient() {
  const email = recipientEmailEl.value.trim();

  if (email === '') {
    recipientFormMessage.textContent = 'Please enter an email address.';
    recipientFormMessage.className = 'form-message error';
    return;
  }

  if (!isValidEmail(email)) {
    recipientFormMessage.textContent = 'Please enter a valid email address.';
    recipientFormMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });

    const data = await response.json();

    if (!response.ok) {
      recipientFormMessage.textContent = data.error || 'Could not add recipient.';
      recipientFormMessage.className = 'form-message error';
      return;
    }

    recipientFormMessage.textContent = 'Recipient added!';
    recipientFormMessage.className = 'form-message success';
    recipientEmailEl.value = '';

    setTimeout(function () {
      recipientFormMessage.textContent = '';
    }, 1500);

    loadRecipients();

  } catch (error) {
    recipientFormMessage.textContent = 'Could not add recipient. Is the backend running?';
    recipientFormMessage.className = 'form-message error';
    console.error('Error adding recipient:', error);
  }
}
addRecipientBtn.addEventListener('click', addRecipient);

recipientEmailEl.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') addRecipient();
});

recipientsList.addEventListener('click', async function (event) {
  if (!event.target.matches('.remove-recipient')) return;

  const row = event.target.closest('.recipient-row');
  const recipientId = row.dataset.recipientId;
  const email = row.querySelector('span').textContent;

  const confirmed = window.confirm(`Remove ${email} from the recipient list?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/recipients/${recipientId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      alert('Could not remove recipient.');
      return;
    }

    loadRecipients();

  } catch (error) {
    alert('Could not remove recipient. Is the backend running?');
    console.error('Error removing recipient:', error);
  }
});

loadRecipients();

// ============================================================
// NEW: "Send test email now" button.
// NOTE: assumes Prachi's backend exposes POST /api/send-test-email —
// confirm the exact route name once her scheduler/SMTP work is done.
// ============================================================
const sendTestEmailBtn = document.getElementById('sendTestEmailBtn');
const testEmailMessage = document.getElementById('testEmailMessage');

sendTestEmailBtn.addEventListener('click', async function () {
  testEmailMessage.textContent = 'Sending...';
  testEmailMessage.className = 'form-message';
  sendTestEmailBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/send-test-email`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!response.ok) {
      testEmailMessage.textContent = data.error || 'Could not send test email.';
      testEmailMessage.className = 'form-message error';
      return;
    }

    testEmailMessage.textContent = 'Test email sent!';
    testEmailMessage.className = 'form-message success';

  } catch (error) {
    testEmailMessage.textContent = 'Could not send test email. Is the backend running?';
    testEmailMessage.className = 'form-message error';
    console.error('Error sending test email:', error);
  } finally {
    sendTestEmailBtn.disabled = false;
  }
});