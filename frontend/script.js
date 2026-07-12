// ============================================================
// CONFIG — matches Prachi's Flask server (confirmed running on port 5000)
// ============================================================
const API_BASE = 'http://localhost:5000/api';

// ---------- Element references ----------
const openBtn      = document.getElementById('openFormBtn');
const cancelBtn    = document.getElementById('cancelFormBtn');
const saveBtn      = document.getElementById('saveVendorBtn');
const overlay      = document.getElementById('addVendorModal');
const vendorNameEl = document.getElementById('vendorName');
const formMessage  = document.getElementById('formMessage');
const contractsList = document.getElementById('contractsList');

// ---------- Modal open/close ----------
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
// NOTE: Prachi's backend only has /api/vendors right now — there's no
// /api/contracts endpoint yet, and vendors don't have a due_date field.
// So for now we just show vendor name + status, with NO color dot yet.
// ============================================================

function vendorRowHTML(vendor) {
  return `
    <div class="contract-row">
      <div class="row-left">
        <div>
          <div class="vendor-name">${vendor.name}</div>
          <div class="contract-meta">Status: ${vendor.status}</div>
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
// Load the real vendor list from the API (GET request)
// ============================================================
async function loadVendors() {
  try {
    const response = await fetch(`${API_BASE}/vendors`);
    const vendors = await response.json();

    if (vendors.length === 0) {
      contractsList.innerHTML = `<p style="font-size:13px; color:#6b7684;">No vendors yet.</p>`;
      return;
    }

    contractsList.innerHTML = vendors.map(vendorRowHTML).join('');
  } catch (error) {
    contractsList.innerHTML = `<p style="font-size:13px; color:#a33d33;">Could not load vendors. Is the backend running?</p>`;
    console.error('Error loading vendors:', error);
  }
}

// ============================================================
// Save a new vendor (POST request) — only sends "name", since that's
// all Prachi's backend currently accepts.
// ============================================================
async function saveVendor() {
  const name = vendorNameEl.value.trim();

  if (name === '') {
    formMessage.textContent = 'Please enter a vendor name.';
    formMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });

    const data = await response.json();

    if (!response.ok) {
      formMessage.textContent = data.error || 'Could not save vendor.';
      formMessage.className = 'form-message error';
      return;
    }

    formMessage.textContent = 'Vendor added!';
    formMessage.className = 'form-message success';

    vendorNameEl.value = '';
    setTimeout(function () {
      overlay.classList.remove('open');
      formMessage.textContent = '';
      loadVendors();
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
loadVendors();