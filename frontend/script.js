const API_BASE = 'http://localhost:5000/api';

const openBtn       = document.getElementById('openFormBtn');
const cancelBtn     = document.getElementById('cancelFormBtn');
const saveBtn       = document.getElementById('saveVendorBtn');
const overlay       = document.getElementById('addVendorModal');
const vendorNameEl  = document.getElementById('vendorName');
const formMessage   = document.getElementById('formMessage');
const contractsGrid = document.getElementById('contractsGrid');

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

function formatAmount(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function contractCardHTML(contract) {
  const color = contract.color || 'gray';
  const dueDateDisplay = contract.due_date || 'No due date';

  return `
    <div class="contract-card ${color}">
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
    }, 800);

  } catch (error) {
    formMessage.textContent = 'Could not save vendor. Is the backend running?';
    formMessage.className = 'form-message error';
    console.error('Error saving vendor:', error);
  }
}

saveBtn.addEventListener('click', saveVendor);

loadContracts();