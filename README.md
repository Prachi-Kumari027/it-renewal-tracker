# IT Renewal Tracker

A web app that tracks a company's IT vendor contracts (cloud hosting, licenses, security, hardware AMC, etc.) and shows which ones are due for renewal soon, color-coded by urgency.

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
│   ├── schema.sql             # Database table definitions
│   └── IT_Service_Contract_Details_Fy25-26.xlsx   # (not in git, add manually)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
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

4. Create the database (only needs to be done once):
   ```
   python create_db.py
   ```

5. Load vendor names from the Excel sheet into the database (only needs to be done once):
   ```
   python migrate_vendors.py
   ```

6. Start the backend server:
   ```
   python app.py
   ```
   You should see it running at `http://127.0.0.1:5000`. Leave this terminal open while using the app.

## Frontend setup

1. Open the `frontend` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (requires the Live Server extension).
3. The dashboard should open in your browser and load real contracts from the backend.

**Note:** Both the backend (step 6 above) and the frontend must be running at the same time for the dashboard to load data.

## Features

- View all contracts as a color-coded card grid, based on renewal due date
- Add a new vendor
- Add a new contract, linked to a vendor
- Renew an existing contract (update its PO number and due date)

## Tech stack

- **Backend:** Python, Flask, SQLite
- **Frontend:** HTML, CSS, JavaScript (no frameworks)