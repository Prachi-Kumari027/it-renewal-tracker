# IT Renewal Tracker

A web app that tracks a company's IT vendor contracts (cloud hosting, licenses, security, hardware AMC, etc.) and shows which ones are due for renewal soon, color-coded by urgency. Automatically emails a daily digest to a configurable list of recipients.

- 🔴 Red — 10 days or fewer left
- 🟡 Yellow — 11–20 days left
- 🟢 Green — 21–30+ days left

## Project structure

```
it-renewal-tracker/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── create_db.py           # Creates the database (run once)
│   ├── migrate_vendors.py     # Loads vendor names from the Excel sheet (run once)
│   ├── migrate_contracts.py   # Loads real contract data from the Excel sheet (run once)
│   ├── digest.py              # Builds the grouped (red/yellow/green) digest data
│   ├── email_utils.py         # SMTP sending logic (Gmail app password)
│   ├── test_emails.py         # CLI script to send a one-off test email
│   ├── schema.sql             # Database table definitions
│   └── IT_Service_Contract_Details_Fy25-26.xlsx   # (not in git, add manually)
├── frontend/
│   ├── index.html             # Main dashboard
│   ├── recipients.html        # Email recipients admin page
│   ├── email-template.html    # Digest email design (used as a template by the backend)
│   ├── script.js
│   ├── recipients.js
│   └── style.css
├── requirements.txt
└── README.md
```

## Backend setup

1. Open a terminal and go to the `backend` folder:
   ```
   cd backend
   ```

2. Install the required Python packages:
   ```
   pip install -r ../requirements.txt
   ```

3. Make sure the Excel file `IT_Service_Contract_Details_Fy25-26.xlsx` is present in the `backend` folder (this file is not tracked in git — copy it in manually).

4. Create the database (only needs to be done once, or after a schema change):
   ```
   python create_db.py
   ```

5. Load vendor names and contract data from the Excel sheet (only needs to be done once, or after a schema change):
   ```
   python migrate_vendors.py
   python migrate_contracts.py
   ```

6. Set up email sending: copy `.env.example` to `.env` in the `backend` folder and fill in a real Gmail address and an [App Password](https://myaccount.google.com/apppasswords) (not your normal Gmail password).

7. Start the backend server:
   ```
   python app.py
   ```
   You should see it running at `http://127.0.0.1:5000`. Leave this terminal open while using the app.

## Frontend setup

1. Open the `frontend` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (requires the Live Server extension).
3. The dashboard should open in your browser and load real contracts from the backend.

**Note:** Both the backend (step 7 above) and the frontend must be running at the same time for the dashboard to load data.

## Features

- View all contracts as a color-coded card grid, based on renewal due date
- Search contracts by vendor, type, PO number, or remarks
- Filter contracts by type and status
- Add a new vendor
- Add a new contract, linked to a vendor
- Renew an existing contract (updates PO number and due date, logs the old PO to history)
- View full contract details and renewal history in a detail modal
- Discontinue a vendor (with confirmation), with a toggle to show/hide discontinued vendors
- Manage email digest recipients (add/remove) on a dedicated admin page
- Send a test digest email on demand (requires backend endpoint, in progress)

## Tech stack

- **Backend:** Python, Flask, SQLite, smtplib (Gmail SMTP)
- **Frontend:** HTML, CSS, JavaScript (no frameworks)