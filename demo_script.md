# Demo Script — IT Renewal Tracker

A suggested run-through order, covering every built feature in a natural sequence. Roughly 5-7 minutes if you talk through it at a normal pace.

## 1. The problem (30 seconds)

"We used to track all our IT vendor contracts in an Excel sheet, with no automatic alerts — it was easy to miss a renewal. This app replaces that sheet with a real dashboard and automatic email reminders."

## 2. The dashboard (1 minute)

Open the live dashboard.
- Point out the color-coded cards: red (urgent), yellow (approaching), green (safe), gray (no due date set).
- Point out the legend at the top explaining the color thresholds.

## 3. Search and filter (1 minute)

- Type a vendor name or contract type into the search box — show it matching across multiple fields at once, without picking a field first.
- Use the filter dropdowns to narrow by type or status.

## 4. Adding a vendor and a contract (1-2 minutes)

- Click "+ Add vendor," add a short-lived demo vendor (e.g. "Demo Vendor Ltd").
- Click "+ Add contract," attach it to that vendor, set a due date a few days out so it lands in red — good visual payoff.
- Point out the "Other" option in the contract type dropdown, for anything not in the preset list.

## 5. Renew + history (1 minute)

- Click "Renew" on the contract just created, give it a new PO number and a later due date.
- Click "View" and show the History section — the old PO number and date are still there, nothing was lost.

## 6. Discontinuing a vendor (30 seconds)

- Open "+ Add vendor" again, find the demo vendor, click "Discontinue," confirm the prompt.
- Show it disappearing from the default list, then reappearing when "Show discontinued" is ticked.
- Mention: its contract history stays fully intact — nothing gets deleted, just hidden by default.

## 7. Email digest (1-2 minutes)

- Open the Recipients page, add an email address live.
- Click "Send test email now" and open the inbox to show the real email arriving — grouped by urgency, matching the dashboard's colors exactly.
- Mention the automatic daily version runs on its own schedule, and won't send twice in one day even if something restarts.

## 8. Wrap-up (30 seconds)

"Everything here is live and hosted — [URL] — with real company contract data migrated in from the original spreadsheet, not sample data."

---

## If something doesn't cooperate live

- Backend down / slow to wake up: PythonAnywhere free tier can take a moment on first request after being idle — worth opening the site once, quietly, a minute or two before the actual demo starts.
- Email doesn't arrive instantly: mention spam folders can briefly hold first-time senders; have a backup screenshot of a previously received digest ready, just in case.