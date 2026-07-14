const API_BASE = 'http://localhost:5000/api';

const openVendorFormBtn   = document.getElementById('openVendorFormBtn');
const cancelVendorFormBtn = document.getElementById('cancelVendorFormBtn');
const saveVendorBtn       = document.getElementById('saveVendorBtn');
const vendorOverlay       = document.getElementById('addVendorModal');
const vendorNameEl        = document.getElementById('vendorName');
const vendorFormMessage   = document.getElementById('vendorFormMessage');

const openContractFormBtn   = document.getElementById('openContractFormBtn');
const cancelContractFormBtn = document.getElementById('cancelContractFormBtn');
const saveContractBtn       = document.getElementById('saveContractBtn');
const contractOverlay       = document.getElementById('addContractModal');
const contractVendorEl      = document.getElementById('contractVendor');
const contractTypeEl        = document.getElementById('contractType');
const contractPOEl          = document.getElementById('contractPO');
const contractStartDateEl   = document.getElementById('contractStartDate');
const contractDueDateEl     = document.getElementById('contractDueDate');
const contractAmountEl      = document.getElementById('contractAmount');
const contractFormMessage   = document.getElementById('contractFormMessage');

const cancelRenewFormBtn = document.getElementById('cancelRenewFormBtn');
const saveRenewBtn       = document.getElementById('saveRenewBtn');
const renewOverlay       = document.getElementById('renewModal');
const renewContractIdEl  = document.getElementById('renewContractId');
const renewOldPOEl       = document.getElementById('renewOldPO');
const renewNewPOEl       = document.getElementById('renewNewPO');
const renewNewDueDateEl  = document.getElementById('renewNewDueDate');
const renewFormMessage   = document.getElementById('renewFormMessage');

const contractsGrid = document.getElementById('contractsGrid');

openVendorFormBtn.addEventListener('click', function () {
  vendorOverlay.classList.add('open');
});
cancelVendorFormBtn.addEventListener('click', function () {
  vendorOverlay.classList.remove('open');
});
vendorOverlay.addEventListener('click', function (event) {
  if (event.target === vendorOverlay) vendorOverlay.classList.remove('open');
});

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

    contractVendorEl.innerHTML = vendors
      .map(v => `<option value="${v.vendor_id}">${v.name}</option>`)
      .join('');
  } catch (error) {
    contractVendorEl.innerHTML = `<option value="">Could not load vendors</option>`;
    console.error('Error loading vendors for dropdown:', error);
  }
}

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
});
cancelRenewFormBtn.addEventListener('click', function () {
  renewOverlay.classList.remove('open');
});
renewOverlay.addEventListener('click', function (event) {
  if (event.target === renewOverlay) renewOverlay.classList.remove('open');
});

function formatAmount(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function contractCardHTML(contract) {
  const color = contract.color || 'gray';
  const dueDateDisplay = contract.due_date || 'No due date';

  return `
    <div class="contract-card ${color}"
         data-contract-id="${contract.contract_id}"
         data-po-number="${contract.po_number || ''}">
      <div class="card-top">
        <span class="dot ${color}"></span>
        <span class="card-vendor-name">${contract.vendor_name}</span>
      </div>
      <div class="card-field"><b>Type:</b> ${contract.contract_type || 'N/A'}</div>
      <div class="card-field"><b>PO No:</b> ${contract.po_number || 'N/A'}</div>
      <div class="card-field"><b>Due:</b> ${dueDateDisplay}</div>
      <div class="card-field"><b>Amount:</b> ${formatAmount(contract.yearly_amount)}</div>
      <div class="card-actions">
        <button class="btn">View</button>
        <button class="btn renew">Renew</button>
        <button class="btn danger">Discontinue</button>
      </div>
    </div>
  `;
}

async function loadContracts() {
  try {
    const response = await fetch(`${API_BASE}/contracts`);
    const contracts = await response.json();

    if (contracts.length === 0) {
      contractsGrid.innerHTML = `<p style="font-size:13px; color:#6b7684;">No contracts yet.</p>`;
      return;
    }

    contractsGrid.innerHTML = contracts.map(contractCardHTML).join('');
  } catch (error) {
    contractsGrid.innerHTML = `<p style="font-size:13px; color:#a33d33;">Could not load contracts. Is the backend running?</p>`;
    console.error('Error loading contracts:', error);
  }
}

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

async function saveContract() {
  const vendorId = contractVendorEl.value;

  if (!vendorId) {
    contractFormMessage.textContent = 'Please select a vendor.';
    contractFormMessage.className = 'form-message error';
    return;
  }

  const payload = {
    vendor_id: Number(vendorId),
    contract_type: contractTypeEl.value,
    po_number: contractPOEl.value.trim(),
    start_date: contractStartDateEl.value || null,
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

    contractPOEl.value = '';
    contractStartDateEl.value = '';
    contractDueDateEl.value = '';
    contractAmountEl.value = '';

    setTimeout(function () {
      contractOverlay.classList.remove('open');
      contractFormMessage.textContent = '';
      loadContracts();
    }, 800);

  } catch (error) {
    contractFormMessage.textContent = 'Could not save contract. Is the backend running?';
    contractFormMessage.className = 'form-message error';
    console.error('Error saving contract:', error);
  }
}
saveContractBtn.addEventListener('click', saveContract);

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
      loadContracts();
    }, 800);

  } catch (error) {
    renewFormMessage.textContent = 'Could not save renewal. Is the backend running?';
    renewFormMessage.className = 'form-message error';
    console.error('Error saving renewal:', error);
  }
}
saveRenewBtn.addEventListener('click', saveRenewal);

loadContracts();