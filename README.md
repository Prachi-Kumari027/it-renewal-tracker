# IT Renewal Tracker

A web app that tracks a company's IT vendor contracts (cloud hosting, licenses, security, hardware AMC, etc.) and shows which ones are due for renewal soon, color-coded by urgency. Automatically emails a daily digest to a configurable list of recipients, and lets you send that digest on demand for demos.

**Live app:** https://prachikumari.pythonanywhere.com/app/index.html 
- 🔴 Red — 10 days or fewer left
- 🟡 Yellow — 11–20 days left
- 🟢 Green — 21–30+ days left
- ⚪ Gray — no due date set yet (flagged separately, not treated as "safe")

## Project structure

```
it-renewal-tracker/
├── backend/
│   ├── app.py                  # Flask API server (all routes, error handlers, scheduler)
│   ├── create_db.py            # Creates the database tables (run once)
│   ├── migrate_vendors.py      # Loads vendor names from the Excel sheet (run once)
│   ├── migrate_contracts.py    # Loads real contract data from the Excel sheet (run once)
│   ├── digest.py               # Builds the grouped (red/yellow/green/gray) digest data + renders the email
│   ├── email_utils.py          # SMTP sending logic (Gmail app password)
│   ├── test_email.py           # CLI script to send a one-off test email, for troubleshooting SMTP setup
│   ├── send_daily_digest.py    # Standalone script for hosted daily scheduling (see Hosting section)
│   ├── schema.sql              # Database table definitions
│   ├── .env.example            # Template for required environment variables (copy to .env, fill in real values)
│   └── IT_Service_Contract_Details_Fy25-26.xlsx   # (not in git — add manually, see setup below)
├── frontend/
│   ├── index.html              # Main dashboard
│   ├── recipients.html         # Email recipients admin page
│   ├── email-template.html     # Digest email design (read directly by digest.py, not duplicated)
│   ├── script.js
│   ├── recipients.js
│   └── style.css
├── requirements.txt
└── README.md
```

## Backend setup (local development)

1. From the repo root, install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

2. Go to the `backend` folder:
   ```
   cd backend
   ```

3. Make sure the Excel file `IT_Service_Contract_Details_Fy25-26.xlsx` is present in this folder (not tracked in git — copy it in manually each time you set up a fresh copy of the project).

4. Create the database tables (only needs doing once, or after a schema change):
   ```
   python create_db.py
   ```
   This runs the full `schema.sql`, creating all tables in one go — `vendors`,
   `contracts`, `contract_history`, `recipients`, and `digest_send_log`.
   No manual SQL needed.

5. Load vendor names and contract data from the Excel sheet (only needs doing once, or after a schema change):
   ```
   python migrate_vendors.py
   python migrate_contracts.py
   ```
   `migrate_contracts.py` prints a summary of anything it had to skip or flag (a few rows in the source spreadsheet have messy/ambiguous data) — worth a read the first time you run it.

6. Set up email sending: copy `.env.example` to a new file named `.env` (same folder), and fill in a real Gmail address and an [App Password](https://myaccount.google.com/apppasswords) (not your normal Gmail password — see the comments inside `.env.example` for how to generate one).

7. Start the backend server:
   ```
   python app.py
   ```
   Runs at `http://127.0.0.1:5000`. Also starts a daily scheduler (fires at 08:00) for local testing — see the Hosting section for how this works once deployed instead.

## Frontend setup (local development)

1. Open the `frontend` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (requires the Live Server extension).
3. The dashboard should open in your browser and load real contracts from the backend.
4. `recipients.html` (the email recipients admin page) can be opened the same way.

**Note:** the backend (step 7 above) must be running at the same time as the frontend for the dashboard to load data, when testing locally.

## Hosting / deployment

The backend is deployed on **PythonAnywhere**: https://prachikumari.pythonanywhere.com

Chosen specifically because it provides a genuinely persistent filesystem on its free tier — unlike some other free hosts, where a SQLite database file can get wiped on every restart.

Key differences from local setup, when hosted:
- The daily digest email is **not** handled by the in-app scheduler (that only starts when you run `python app.py` directly — PythonAnywhere's WSGI setup never executes that code path). Instead, `send_daily_digest.py` is run once a day via PythonAnywhere's own **"Tasks"** scheduler feature, which is more reliable for a hosted process.
- `.env` needs to be created separately **on the server itself** — it's a different file from your local one, and isn't something `git pull` brings over (correctly — it holds real credentials and should never be committed).
- The frontend (`index.html`, `recipients.html`, etc.) currently still runs from local files on each person's computer, pointed at the hosted backend URL via `API_BASE` in `script.js` and `recipients.js`.

## Features

- View all contracts as a color-coded card grid, based on renewal due date
- Search contracts by vendor, type, PO number, remarks, and more — one search box, no need to specify which field
- Filter contracts by type, vendor, and status (active/discontinued)
- Add a new vendor; discontinue a vendor (soft-delete, with confirmation), with a toggle to show/hide discontinued vendors
- Add a new contract, linked to a vendor, with separate due date (renewal reminder) and end date (contract expiry) fields
- Renew an existing contract (updates PO number and due date, logs the old PO + date to history automatically)
- View full contract details and renewal history in a detail modal
- Manage email digest recipients (add/remove) on a dedicated admin page, with duplicate protection (case-insensitive)
- Send a test digest email on demand, for live demos, without waiting for the daily schedule
- Daily automated digest email, grouped by urgency, skipping discontinued vendors, with a fallback message when nothing needs attention, and protection against sending twice in one day

## Tech stack

- **Backend:** Python, Flask, SQLite, smtplib (Gmail SMTP), APScheduler (local dev), Chevron (email templating)
- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Hosting:** PythonAnywhere