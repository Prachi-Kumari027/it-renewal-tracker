const API_BASE = 'https://PrachiKumari.pythonanywhere.com/api';

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


contractTypeEl.addEventListener('change', function () {
  contractTypeOtherGroup.style.display = (contractTypeEl.value === 'other') ? 'block' : 'none';
});


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

// ---------- Element references: detail modal ----------
const detailOverlay     = document.getElementById('detailModal');
const closeDetailBtn    = document.getElementById('closeDetailBtn');
const detailVendorName  = document.getElementById('detailVendorName');
const detailFields      = document.getElementById('detailFields');
const detailHistory     = document.getElementById('detailHistory');

// ---------- Element references: export (NEW today) ----------
const exportExcelBtn = document.getElementById('exportExcelBtn');

const contractsGrid = document.getElementById('contractsGrid');
const summaryStrip = document.getElementById('summaryStrip');
const showDiscontinuedToggle = document.getElementById('showDiscontinuedToggle');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');


let allContracts = [];

showDiscontinuedToggle.addEventListener('change', function () {
  renderContracts(allContracts);
});

searchInput.addEventListener('input', function () {
  renderContracts(allContracts);
});

typeFilter.addEventListener('change', function () {
  renderContracts(allContracts);
});

statusFilter.addEventListener('change', function () {
  renderContracts(allContracts);
});


function populateFilterOptions(contracts) {
  const types = [...new Set(contracts.map(c => c.contract_type).filter(Boolean))].sort();
  const statuses = [...new Set(contracts.map(c => c.procurement_status).filter(Boolean))].sort();

  typeFilter.innerHTML = `<option value="">All types</option>` +
    types.map(t => `<option value="${t}">${t}</option>`).join('');

  statusFilter.innerHTML = `<option value="">All statuses</option>` +
    statuses.map(s => `<option value="${s}">${s}</option>`).join('');
}


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


closeDetailBtn.addEventListener('click', function () {
  detailOverlay.classList.remove('open');
});
detailOverlay.addEventListener('click', function (event) {
  if (event.target === detailOverlay) detailOverlay.classList.remove('open');
});


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
  const daysLeftText = formatDaysLeft(contract.days_remaining);

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
      <div class="card-field days-left"><span class="label">Renewal:</span> <span class="value ${color}">${daysLeftText}</span></div>
      <div class="card-field"><span class="label">Type:</span> <span class="value">${contract.contract_type || 'N/A'}</span></div>
      <div class="card-field"><span class="label">PO No:</span> <span class="value">${contract.po_number || 'N/A'}</span></div>
      <div class="card-field"><span class="label">Due:</span> <span class="value">${dueDateDisplay}</span></div>
      <div class="card-field"><span class="label">End Date:</span> <span class="value">${formatDateDMY(contract.end_date) || 'N/A'}</span></div>
      <div class="card-field"><span class="label">Master Contract:</span> <span class="value">${contract.master_contract_note || 'N/A'}</span></div>
      <div class="card-actions">
        <button class="btn view">View</button>
        <button class="btn renew">Renew</button>
        <button class="btn danger" ${isDiscontinued ? 'disabled' : ''}>Discontinue</button>
      </div>
    </div>
  `;
}


function formatDaysLeft(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return 'No due date set';
  if (daysRemaining < 0) return `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`;
  if (daysRemaining === 0) return 'Due today';
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;
}

async function loadContracts() {
  try {
    const [contractsResponse, vendorsResponse] = await Promise.all([
      fetch(`${API_BASE}/contracts`),
      fetch(`${API_BASE}/vendors`)
    ]);

    const contracts = await contractsResponse.json();
    const vendors = await vendorsResponse.json();

    // Build a quick lookup: vendor_id -> status
    const vendorStatusById = {};
    vendors.forEach(v => { vendorStatusById[v.vendor_id] = v.status; });


    allContracts = contracts.map(c => ({
      ...c,
      vendor_status: vendorStatusById[c.vendor_id] || 'active'
    }));

    populateFilterOptions(allContracts);
    renderContracts(allContracts);
    renderSummaryStrip(allContracts);
  } catch (error) {
    contractsGrid.innerHTML = `<p class="state-message error">Could not load contracts. Is the backend running?</p>`;
    console.error('Error loading contracts:', error);
  }
}


function renderSummaryStrip(contracts) {
  const counts = { red: 0, yellow: 0, green: 0, gray: 0 };
  const discontinuedVendorIds = new Set();

  contracts.forEach(function (c) {
    if (c.vendor_status === 'discontinued') {
      discontinuedVendorIds.add(c.vendor_id);
      return;
    }
    const color = c.color || 'gray';
    if (counts[color] !== undefined) {
      counts[color]++;
    }
  });

  summaryStrip.innerHTML = `
    <div class="summary-item red">
      <span class="summary-count">${counts.red}</span>
      <span class="summary-label">Red</span>
    </div>
    <div class="summary-item yellow">
      <span class="summary-count">${counts.yellow}</span>
      <span class="summary-label">Yellow</span>
    </div>
    <div class="summary-item green">
      <span class="summary-count">${counts.green}</span>
      <span class="summary-label">Green</span>
    </div>
    <div class="summary-item gray">
      <span class="summary-count">${counts.gray}</span>
      <span class="summary-label">No due date</span>
    </div>
    <div class="summary-item discontinued">
      <span class="summary-count">${discontinuedVendorIds.size}</span>
      <span class="summary-label">Discontinued vendors</span>
    </div>
  `;
}


function renderContracts(contracts) {
  const showDiscontinued = showDiscontinuedToggle.checked;
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedStatus = statusFilter.value;

  let visibleContracts = showDiscontinued
    ? contracts
    : contracts.filter(c => c.vendor_status !== 'discontinued');

  if (searchTerm !== '') {
    visibleContracts = visibleContracts.filter(c => matchesSearch(c, searchTerm));
  }

  if (selectedType !== '') {
    visibleContracts = visibleContracts.filter(c => c.contract_type === selectedType);
  }

  if (selectedStatus !== '') {
    visibleContracts = visibleContracts.filter(c => c.procurement_status === selectedStatus);
  }

  if (visibleContracts.length === 0) {
    contractsGrid.innerHTML = `<p class="state-message">No contracts to show.</p>`;
    return;
  }

  contractsGrid.innerHTML = visibleContracts.map(contractCardHTML).join('');
}


function matchesSearch(contract, term) {
  const searchableFields = [
    contract.vendor_name,
    contract.contract_type,
    contract.po_number,
    contract.details,
    contract.master_contract_note,
    contract.remarks,
    contract.procurement_status
  ];

  return searchableFields.some(field =>
    field && String(field).toLowerCase().includes(term)
  );
}


async function discontinueVendor(vendorId, vendorName) {

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

  // If "Other" was picked, use whatever the user typed instead
  const selectedType = contractTypeEl.value === 'other'
    ? contractTypeOtherEl.value.trim()
    : contractTypeEl.value;

  const payload = {
    vendor_id: Number(vendorId),
    contract_type: selectedType,
    po_number: contractPOEl.value.trim(),
    start_date: contractStartDateEl.value || null,
    end_date: contractEndDateEl.value || null,
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


function formatDate(value) {
  return formatDateDMY(value) || 'N/A';
}

function renderDetailFields(contract) {
  const rows = [
    ['Type', contract.contract_type],
    ['PO Number', contract.po_number],
    ['Details', contract.details],
    ['Start Date', formatDate(contract.start_date)],
    ['Due Date', formatDate(contract.due_date)],
    ['End Date', formatDate(contract.end_date)],
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
    detailHistory.innerHTML = `<p class="state-message">No renewal history yet.</p>`;
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
  detailHistory.innerHTML = `<p class="state-message"><span class="spinner"></span> Loading history...</p>`;
  detailOverlay.classList.add('open');

  try {
   
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
    detailFields.innerHTML = `<p class="state-message error">Could not load contract details.</p>`;
    console.error('Error loading contract detail:', error);
  }
}


function exportContractsToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Export library failed to load. Check your internet connection and try again.');
    return;
  }

  if (allContracts.length === 0) {
    alert('There are no contracts to export yet.');
    return;
  }

  const rows = allContracts.map(function (c) {
    return {
      'Vendor': c.vendor_name,
      'Vendor Status': c.vendor_status || 'active',
      'Type': c.contract_type || '',
      'PO Number': c.po_number || '',
      'Start Date': formatDateDMY(c.start_date) || '',
      'Due Date': formatDateDMY(c.due_date) || '',
      'End Date': formatDateDMY(c.end_date) || '',
      'Days Remaining': (c.days_remaining === null || c.days_remaining === undefined) ? '' : c.days_remaining,
      'Yearly Amount': (c.yearly_amount === null || c.yearly_amount === undefined) ? '' : c.yearly_amount,
      'Procurement Status': c.procurement_status || '',
      'Master Contract': c.master_contract_note || '',
      'Remarks': c.remarks || '',
      'Details': c.details || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

 
  worksheet['!cols'] = [
    { wch: 24 }, // Vendor
    { wch: 12 }, // Vendor Status
    { wch: 20 }, // Type
    { wch: 14 }, // PO Number
    { wch: 12 }, // Start Date
    { wch: 12 }, // Due Date
    { wch: 12 }, // End Date
    { wch: 14 }, // Days Remaining
    { wch: 14 }, // Yearly Amount
    { wch: 16 }, // Procurement Status
    { wch: 24 }, // Master Contract
    { wch: 24 }, // Remarks
    { wch: 24 }  // Details
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contracts');


  const today = new Date();
  const stamp = today.toISOString().slice(0, 10); // YYYY-MM-DD
  XLSX.writeFile(workbook, `vendor-contracts-${stamp}.xlsx`);
}
exportExcelBtn.addEventListener('click', exportContractsToExcel);


loadContracts();