
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','discontinued')),
    discontinued_on DATE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME
);

CREATE TABLE IF NOT EXISTS contracts (
    contract_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id             INTEGER NOT NULL REFERENCES vendors(vendor_id),
    contract_type         TEXT,
    details               TEXT,
    master_contract_note  TEXT,
    po_number             TEXT,
    start_date            DATE,
    due_date              DATE,
    end_date              DATE,
    yearly_amount         NUMERIC(12,2),
    pr_number             TEXT,
    procurement_status    TEXT,
    app_status            TEXT NOT NULL DEFAULT 'active'
                          CHECK (app_status IN ('active','renewed','expired','discontinued')),
    remarks               TEXT,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME
);

CREATE TABLE IF NOT EXISTS contract_history (
    history_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id    INTEGER NOT NULL REFERENCES contracts(contract_id),
    old_po_number  TEXT NOT NULL,
    old_due_date   DATE,
    old_start_date DATE,
    changed_on     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_due_date  ON contracts(due_date);
CREATE INDEX IF NOT EXISTS idx_history_contract_id ON contract_history(contract_id);