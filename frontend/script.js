// ============================================================
// CONFIG — change this if Prachi's server runs on a different
// address/port. Flask's default is usually http://localhost:5000
// ============================================================
const API_BASE = 'http://localhost:5000/api';

// ---------- Element references ----------
const openBtn      = document.getElementById('openFormBtn');
const cancelBtn    = document.getElementById('cancelFormBtn');
const saveBtn      = document.getElementById('saveVendorBtn');
const overlay      = document.getElementById('addVendorModal');
const vendorNameEl = document.getElementById('vendorName');
const vendorTypeEl = document.getElementById('vendorType');
const formMessage  = document.getElementById('formMessage');
const contractsList = document.getElementById('contractsList');

// ---------- Modal open/close (same as Day 2) ----------
openBtn.addEventListener('click', function () {
  overlay.classList.add('open');
});
cancelBtn.addEventListener('click', function () {
  overlay.classList.remove('open');
});
overlay.addEventListener('click', function (event) {
  if (event.target === overlay) {
    overlay.classList.remove('open');
  }
});

// ============================================================
// PART 1 — Figure out the color for a contract based on due date
// ============================================================
function daysRemaining(dueDateStr) {
  const due = new Date(dueDateStr);
  const today = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((due - today) / oneDay);
}

function colorForDays(days) {
  if (days <= 10) return 'red';
  if (days <= 20) return 'yellow';
  if (days <= 30) return 'green';
  return '';
}

// ============================================================
// PART 2 — Build the HTML for one contract row
// ============================================================
function contractRowHTML(contract) {
  const color = colorForDays(daysRemaining(contract.due_date));
  return `
    <div class="contract-row">
      <div class="row-left">
        <span class="dot ${color}"></span>
        <div>
          <div class="vendor-name">${contract.vendor_name}</div>
          <div class="contract-meta">${contract.type} &middot; Due ${contract.due_date}</div>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn">View</button>
        <button class="btn danger">Discontinue</button>
      </div>
    </div>
  `;
}

// ============================================================
// PART 3 — Load the real contract list from the API (GET request)
// ============================================================
async function loadContracts() {
  try {
    const response = await fetch(`${API_BASE}/contracts`);
    const contracts = await response.json();

    if (contracts.length === 0) {
      contractsList.innerHTML = `<p style="font-size:13px; color:#6b7684;">No contracts yet.</p>`;
      return;
    }

    contractsList.innerHTML = contracts.map(contractRowHTML).join('');
  } catch (error) {
    contractsList.innerHTML = `<p style="font-size:13px; color:#a33d33;">Could not load contracts. Is the backend running?</p>`;
    console.error('Error loading contracts:', error);
  }
}

// ============================================================
// PART 4 — Save a new vendor (POST request)
// ============================================================
async function saveVendor() {
  const name = vendorNameEl.value.trim();
  const type = vendorTypeEl.value;

  if (name === '') {
    formMessage.textContent = 'Please enter a vendor name.';
    formMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, type: type })
    });

    if (!response.ok) {
      throw new Error('Server returned an error');
    }

    formMessage.textContent = 'Vendor added!';
    formMessage.className = 'form-message success';

    vendorNameEl.value = '';
    setTimeout(function () {
      overlay.classList.remove('open');
      formMessage.textContent = '';
      loadContracts();
    }, 800);

  } catch (error) {
    formMessage.textContent = 'Could not save vendor. Is the backend running?';
    formMessage.className = 'form-message error';
    console.error('Error saving vendor:', error);
  }
}

saveBtn.addEventListener('click', saveVendor);

// ============================================================
// Run this once when the page first loads
// ============================================================
loadContracts();