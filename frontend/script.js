const API_BASE = 'http://localhost:5000/api';

// ---------- Element references: vendor form ----------
const openVendorFormBtn   = document.getElementById('openVendorFormBtn');
const cancelVendorFormBtn = document.getElementById('cancelVendorFormBtn');
const saveVendorBtn       = document.getElementById('saveVendorBtn');
const vendorOverlay       = document.getElementById('addVendorModal');
const vendorNameEl        = document.getElementById('vendorName');
const vendorFormMessage   = document.getElementById('vendorFormMessage');

// ---------- Element references: contract form ----------
const openContractFormBtn   = document.getElementById('openContractFormBtn');
const cancelContractFormBtn = document.getElementById('cancelContractFormBtn');
const saveContractBtn       = document.getElementById('saveContractBtn');
const contractOverlay       = document.getElementById('addContractModal');
const contractVendorEl      = document.getElementById('contractVendor');
const contractTypeEl        = document.getElementById('contractType');
const contractTypeOtherGroup = document.getElementById('contractTypeOtherGroup');
const contractTypeOtherEl   = document.getElementById('contractTypeOther');
const contractPOEl          = document.getElementById('contractPO');
const contractStartDateEl   = document.getElementById('contractStartDate');
const contractEndDateEl     = document.getElementById('contractEndDate');
const contractDueDateEl     = document.getElementById('contractDueDate');
const contractAmountEl      = document.getElementById('contractAmount');
const contractFormMessage   = document.getElementById('contractFormMessage');

// Show the "custom type" box only when "Other" is selected
contractTypeEl.addEventListener('change', function () {
  contractTypeOtherGroup.style.display = (contractTypeEl.value === 'other') ? 'block' : 'none';
});

// PO number: strip out anything that isn't a digit, as the user types.
// This is what makes letters "impossible" to type, not just rejected on submit.
contractPOEl.addEventListener('input', function () {
  contractPOEl.value = contractPOEl.value.replace(/\D/g, '');
});

// ---------- Element references: renew form ----------
const cancelRenewFormBtn = document.getElementById('cancelRenewFormBtn');
const saveRenewBtn       = document.getElementById('saveRenewBtn');
const renewOverlay       = document.getElementById('renewModal');
const renewContractIdEl  = document.getElementById('renewContractId');
const renewOldPOEl       = document.getElementById('renewOldPO');
const renewNewPOEl       = document.getElementById('renewNewPO');
const renewNewDueDateEl  = document.getElementById('renewNewDueDate');
const renewFormMessage   = document.getElementById('renewFormMessage');

// Same digit-only restriction for the renew form's PO field
renewNewPOEl.addEventListener('input', function () {
  renewNewPOEl.value = renewNewPOEl.value.replace(/\D/g, '');
});

// ---------- Element references: detail modal (NEW today) ----------
const detailOverlay     = document.getElementById('detailModal');
const closeDetailBtn    = document.getElementById('closeDetailBtn');
const detailVendorName  = document.getElementById('detailVendorName');
const detailFields      = document.getElementById('detailFields');
const detailHistory     = document.getElementById('detailHistory');

const contractsGrid = document.getElementById('contractsGrid');
const showDiscontinuedToggle = document.getElementById('showDiscontinuedToggle');

// Keeps the last-fetched contracts in memory, so toggling "show
// discontinued" can just re-render instantly without re-fetching.
let allContracts = [];

showDiscontinuedToggle.addEventListener('change', function () {
  renderContracts(allContracts);
});

// ============================================================
// Vendor form open/close (same pattern as before)
// ============================================================
openVendorFormBtn.addEventListener('click', function () {
  vendorOverlay.classList.add('open');
});
cancelVendorFormBtn.addEventListener('click', function () {
  vendorOverlay.classList.remove('open');
});
vendorOverlay.addEventListener('click', function (event) {
  if (event.target === vendorOverlay) vendorOverlay.classList.remove('open');
});

// ============================================================
// Contract form open/close — NEW today.
// When opening, we first load the vendor list into the dropdown,
// since a contract must belong to a real vendor.
// ============================================================
openContractFormBtn.addEventListener('click', async function () {
  await populateVendorDropdown();
  contractOverlay.classList.add('open');
});
cancelContractFormBtn.addEventListener('click', function () {
  contractOverlay.classList.remove('open');
});
contractOverlay.addEventListener('click', function (event) {
  if (event.target === contractOverlay) contractOverlay.classList.remove('open');
});

async function populateVendorDropdown() {
  try {
    const response = await fetch(`${API_BASE}/vendors`);
    const vendors = await response.json();

    if (vendors.length === 0) {
      contractVendorEl.innerHTML = `<option value="">No vendors yet — add one first</option>`;
      return;
    }

    // Build one <option> per vendor. value = vendor_id (what the API needs),
    // visible text = vendor name (what the user reads).
    contractVendorEl.innerHTML = vendors
      .map(v => `<option value="${v.vendor_id}">${v.name}</option>`)
      .join('');
  } catch (error) {
    contractVendorEl.innerHTML = `<option value="">Could not load vendors</option>`;
    console.error('Error loading vendors for dropdown:', error);
  }
}

// ============================================================
// Renew form open/close — opened from a "Renew" button on a card,
// so there's no single fixed button to attach this to up front.
// Instead, we use "event delegation": listen on the whole grid,
// and check if a Renew button was the thing clicked.
// ============================================================
contractsGrid.addEventListener('click', function (event) {
  if (event.target.matches('.btn.renew')) {
    const card = event.target.closest('.contract-card');
    renewContractIdEl.value = card.dataset.contractId;
    renewOldPOEl.value = card.dataset.poNumber || '';
    renewNewPOEl.value = '';
    renewNewDueDateEl.value = '';
    renewFormMessage.textContent = '';
    renewOverlay.classList.add('open');
  }

  if (event.target.matches('.btn.view')) {
    const card = event.target.closest('.contract-card');
    openDetailModal(card.dataset.contractId);
  }

  if (event.target.matches('.btn.danger')) {
    const card = event.target.closest('.contract-card');
    const vendorId = card.dataset.vendorId;
    const vendorName = card.querySelector('.card-vendor-name').textContent;
    discontinueVendor(vendorId, vendorName);
  }
});
cancelRenewFormBtn.addEventListener('click', function () {
  renewOverlay.classList.remove('open');
});
renewOverlay.addEventListener('click', function (event) {
  if (event.target === renewOverlay) renewOverlay.classList.remove('open');
});

// ============================================================
// Detail modal open/close — NEW today.
// ============================================================
closeDetailBtn.addEventListener('click', function () {
  detailOverlay.classList.remove('open');
});
detailOverlay.addEventListener('click', function (event) {
  if (event.target === detailOverlay) detailOverlay.classList.remove('open');
});

// ============================================================
// Rendering contract cards — added data-* attributes so the Renew
// button click handler above can find the right contract.
// ============================================================
// Converts "YYYY-MM-DD" (how dates are stored/sent) into "DD-MM-YYYY"
// (how the mentor wants them displayed). Only affects what's SHOWN —
// the actual <input type="date"> fields still use YYYY-MM-DD internally,
// since that's a browser requirement, not something we can change.
function formatDateDMY(dateStr) {
  if (!dateStr) return null;
  const datePart = dateStr.split(' ')[0]; // drop time if present
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateStr; // fallback, just in case
  return `${day}-${month}-${year}`;
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function contractCardHTML(contract) {
  const color = contract.color || 'gray';
  const dueDateDisplay = formatDateDMY(contract.due_date) || 'No due date';
  const isDiscontinued = contract.vendor_status === 'discontinued';

  return `
    <div class="contract-card ${color} ${isDiscontinued ? 'discontinued' : ''}"
         data-contract-id="${contract.contract_id}"
         data-vendor-id="${contract.vendor_id}"
         data-po-number="${contract.po_number || ''}">
      <div class="card-top">
        <span class="dot ${color}"></span>
        <span class="card-vendor-name">${contract.vendor_name}</span>
        ${isDiscontinued ? '<span class="discontinued-badge">Discontinued</span>' : ''}
      </div>
      <div class="card-field"><span class="label">Type:</span> <span class="value">${contract.contract_type || 'N/A'}</span></div>
      <div class="card-field"><span class="label">PO No:</span> <span class="value">${contract.po_number || 'N/A'}</span></div>
      <div class="card-field"><span class="label">Due:</span> <span class="value">${dueDateDisplay}</span></div>
      <div class="card-field"><span class="label">Amount:</span> <span class="value">${formatAmount(contract.yearly_amount)}</span></div>
      <div class="card-field"><span class="label">Status:</span> <span class="value">${contract.procurement_status || 'N/A'}</span></div>
      <div class="card-field"><span class="label">Master Contract:</span> <span class="value">${contract.master_contract_note || 'N/A'}</span></div>
      <div class="card-field"><span class="label">Remarks:</span> <span class="value">${contract.remarks || 'N/A'}</span></div>
      <div class="card-actions">
        <button class="btn view">View</button>
        <button class="btn renew">Renew</button>
        <button class="btn danger" ${isDiscontinued ? 'disabled' : ''}>Discontinue</button>
      </div>
    </div>
  `;
}

async function loadContracts() {
  try {
    // Fetch contracts AND vendors together — we need the vendor list to
    // know each vendor's status (active/discontinued), since /api/contracts
    // doesn't include that itself.
    const [contractsResponse, vendorsResponse] = await Promise.all([
      fetch(`${API_BASE}/contracts`),
      fetch(`${API_BASE}/vendors`)
    ]);

    const contracts = await contractsResponse.json();
    const vendors = await vendorsResponse.json();

    // Build a quick lookup: vendor_id -> status
    const vendorStatusById = {};
    vendors.forEach(v => { vendorStatusById[v.vendor_id] = v.status; });

    // Attach each contract's vendor status onto the contract itself,
    // so contractCardHTML can use it without a second lookup later.
    allContracts = contracts.map(c => ({
      ...c,
      vendor_status: vendorStatusById[c.vendor_id] || 'active'
    }));

    renderContracts(allContracts);
  } catch (error) {
    contractsGrid.innerHTML = `<p style="font-size:13px; color:#a33d33;">Could not load contracts. Is the backend running?</p>`;
    console.error('Error loading contracts:', error);
  }
}

// Separated from loadContracts so the toggle can re-render instantly
// from the already-fetched data, without hitting the API again.
function renderContracts(contracts) {
  const showDiscontinued = showDiscontinuedToggle.checked;

  const visibleContracts = showDiscontinued
    ? contracts
    : contracts.filter(c => c.vendor_status !== 'discontinued');

  if (visibleContracts.length === 0) {
    contractsGrid.innerHTML = `<p style="font-size:13px; color:#6b7684;">No contracts to show.</p>`;
    return;
  }

  contractsGrid.innerHTML = visibleContracts.map(contractCardHTML).join('');
}

// ============================================================
// NEW: Discontinue a vendor (PUT /api/vendors/<id>/discontinue)
// ============================================================
async function discontinueVendor(vendorId, vendorName) {
  // A native browser confirm() dialog — simple, but does exactly what's
  // needed: pause and make sure this wasn't an accidental click.
  const confirmed = window.confirm(
    `Are you sure you want to discontinue "${vendorName}"? This won't delete anything — it just marks the vendor as discontinued.`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/vendors/${vendorId}/discontinue`, {
      method: 'PUT'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Could not discontinue vendor.');
      return;
    }

    loadContracts(); // refresh so the badge/filtering reflect the change

  } catch (error) {
    alert('Could not discontinue vendor. Is the backend running?');
    console.error('Error discontinuing vendor:', error);
  }
}

// ============================================================
// Save a new vendor (unchanged)
// ============================================================
async function saveVendor() {
  const name = vendorNameEl.value.trim();

  if (name === '') {
    vendorFormMessage.textContent = 'Please enter a vendor name.';
    vendorFormMessage.className = 'form-message error';
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
      vendorFormMessage.textContent = data.error || 'Could not save vendor.';
      vendorFormMessage.className = 'form-message error';
      return;
    }

    vendorFormMessage.textContent = 'Vendor added!';
    vendorFormMessage.className = 'form-message success';

    vendorNameEl.value = '';
    setTimeout(function () {
      vendorOverlay.classList.remove('open');
      vendorFormMessage.textContent = '';
    }, 800);

  } catch (error) {
    vendorFormMessage.textContent = 'Could not save vendor. Is the backend running?';
    vendorFormMessage.className = 'form-message error';
    console.error('Error saving vendor:', error);
  }
}
saveVendorBtn.addEventListener('click', saveVendor);

// ============================================================
// NEW: Save a new contract (POST /api/contracts)
// ============================================================
async function saveContract() {
  const vendorId = contractVendorEl.value;

  if (!vendorId) {
    contractFormMessage.textContent = 'Please select a vendor.';
    contractFormMessage.className = 'form-message error';
    return;
  }

  // If "Other" was picked, use whatever the user typed instead
  const selectedType = contractTypeEl.value === 'other'
    ? contractTypeOtherEl.value.trim()
    : contractTypeEl.value;

  const payload = {
    vendor_id: Number(vendorId),
    contract_type: selectedType,
    po_number: contractPOEl.value.trim(),
    start_date: contractStartDateEl.value || null,
    end_date: contractEndDateEl.value || null,   // NOTE: backend doesn't store this yet
    due_date: contractDueDateEl.value || null,
    yearly_amount: contractAmountEl.value ? Number(contractAmountEl.value) : null
  };

  try {
    const response = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      contractFormMessage.textContent = data.error || 'Could not save contract.';
      contractFormMessage.className = 'form-message error';
      return;
    }

    contractFormMessage.textContent = 'Contract added!';
    contractFormMessage.className = 'form-message success';

    // Clear the form fields
    contractPOEl.value = '';
    contractStartDateEl.value = '';
    contractEndDateEl.value = '';
    contractDueDateEl.value = '';
    contractAmountEl.value = '';
    contractTypeEl.value = 'Cloud Hosting';
    contractTypeOtherEl.value = '';
    contractTypeOtherGroup.style.display = 'none';

    setTimeout(function () {
      contractOverlay.classList.remove('open');
      contractFormMessage.textContent = '';
      loadContracts(); // refresh grid so the new contract appears
    }, 800);

  } catch (error) {
    contractFormMessage.textContent = 'Could not save contract. Is the backend running?';
    contractFormMessage.className = 'form-message error';
    console.error('Error saving contract:', error);
  }
}
saveContractBtn.addEventListener('click', saveContract);

// ============================================================
// NEW: Save a renewal (PUT /api/contracts/<id>)
// ============================================================
async function saveRenewal() {
  const contractId = renewContractIdEl.value;
  const newPO = renewNewPOEl.value.trim();
  const newDueDate = renewNewDueDateEl.value;

  if (!newPO || !newDueDate) {
    renewFormMessage.textContent = 'Please enter both a new PO number and due date.';
    renewFormMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/contracts/${contractId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ po_number: newPO, due_date: newDueDate })
    });

    const data = await response.json();

    if (!response.ok) {
      renewFormMessage.textContent = data.error || 'Could not save renewal.';
      renewFormMessage.className = 'form-message error';
      return;
    }

    renewFormMessage.textContent = 'Renewed!';
    renewFormMessage.className = 'form-message success';

    setTimeout(function () {
      renewOverlay.classList.remove('open');
      renewFormMessage.textContent = '';
      loadContracts(); // refresh grid so the updated due date/color show up
    }, 800);

  } catch (error) {
    renewFormMessage.textContent = 'Could not save renewal. Is the backend running?';
    renewFormMessage.className = 'form-message error';
    console.error('Error saving renewal:', error);
  }
}
saveRenewBtn.addEventListener('click', saveRenewal);

// ============================================================
// NEW: Contract detail modal — fetches full contract info AND
// its renewal history, then fills in the modal with both.
// ============================================================

// (formatDateDMY, defined above near contractCardHTML, is used for all
// date display now — this old formatDate is kept only as a safe fallback
// name in case it's referenced elsewhere, but points to the same logic.)
function formatDate(value) {
  return formatDateDMY(value) || 'N/A';
}

function renderDetailFields(contract) {
  const rows = [
    ['Type', contract.contract_type],
    ['PO Number', contract.po_number],
    ['Start Date', formatDate(contract.start_date)],
    ['Due Date', formatDate(contract.due_date)],
    ['Amount', formatAmount(contract.yearly_amount)],
    ['Status', contract.procurement_status],
    ['Master Contract', contract.master_contract_note],
    ['Remarks', contract.remarks],
  ];

  detailFields.innerHTML = rows
    .map(([label, value]) => `
      <div class="detail-field">
        <span class="label">${label}</span>
        <span class="value">${value || 'N/A'}</span>
      </div>
    `)
    .join('');
}

function renderHistory(historyRows) {
  if (historyRows.length === 0) {
    detailHistory.innerHTML = `<p style="font-size:12px; color:#6b7684;">No renewal history yet.</p>`;
    return;
  }

  detailHistory.innerHTML = historyRows
    .map(h => `
      <div class="history-row">
        <span>PO ${h.old_po_number}</span>
        <span>Changed ${formatDate(h.changed_on)}</span>
      </div>
    `)
    .join('');
}

async function openDetailModal(contractId) {
  detailVendorName.textContent = 'Loading...';
  detailFields.innerHTML = '';
  detailHistory.innerHTML = `<p style="font-size:12px; color:#6b7684;">Loading history...</p>`;
  detailOverlay.classList.add('open');

  try {
    // Fetch both the contract details and its history at the same time,
    // instead of one after another — Promise.all runs them in parallel.
    const [contractResponse, historyResponse] = await Promise.all([
      fetch(`${API_BASE}/contracts/${contractId}`),
      fetch(`${API_BASE}/contracts/${contractId}/history`)
    ]);

    const contract = await contractResponse.json();
    const history = await historyResponse.json();

    detailVendorName.textContent = contract.vendor_name;
    renderDetailFields(contract);
    renderHistory(history);

  } catch (error) {
    detailVendorName.textContent = 'Error';
    detailFields.innerHTML = `<p style="font-size:12px; color:#a33d33;">Could not load contract details.</p>`;
    console.error('Error loading contract detail:', error);
  }
}

// ============================================================
// Run this once when the page first loads
// ============================================================
loadContracts();