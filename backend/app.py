from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date, datetime
import re
import sqlite3

app = Flask(__name__)
CORS(app)  
DB_PATH = "vendor_contracts.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  
    return conn


def compute_days_remaining_and_color(due_date_str):
    
    if not due_date_str:
        return None, "gray"

    due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    days_remaining = (due_date - date.today()).days

    if days_remaining <= 10:
        color = "red"
    elif days_remaining <= 20:
        color = "yellow"
    else:
        color = "green"

    return days_remaining, color

CONTRACT_FIELDS = [
    "contract_type", "details", "master_contract_note", "po_number",
    "start_date", "due_date", "end_date", "yearly_amount", "pr_number",
    "procurement_status", "app_status", "remarks",
]

DATE_FIELDS = ("start_date", "due_date", "end_date")


def is_valid_date(value):
    
    if value is None:
        return True
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def is_valid_po_number(value):
    
    if value is None or value == "":
        return True
    return str(value).isdigit()


def fetch_full_contract(conn, contract_id):
    
    row = conn.execute(
        """
        SELECT c.*, v.name AS vendor_name
        FROM contracts c
        JOIN vendors v ON v.vendor_id = c.vendor_id
        WHERE c.contract_id = ?
        """,
        (contract_id,),
    ).fetchone()

    if row is None:
        return None

    contract = dict(row)
    days_remaining, color = compute_days_remaining_and_color(contract["due_date"])
    contract["days_remaining"] = days_remaining
    contract["color"] = color
    return contract


@app.route("/api/vendors/<int:vendor_id>/discontinue", methods=["PUT"])
def discontinue_vendor(vendor_id):
    
    conn = get_db_connection()

    vendor = conn.execute(
        "SELECT vendor_id, status FROM vendors WHERE vendor_id = ?", (vendor_id,)
    ).fetchone()
    if vendor is None:
        conn.close()
        return jsonify({"error": "Vendor not found"}), 404

    if vendor["status"] == "discontinued":
        conn.close()
        return jsonify({"error": "Vendor is already discontinued"}), 409

    conn.execute(
        """
        UPDATE vendors
        SET status = 'discontinued', discontinued_on = date('now'), updated_at = CURRENT_TIMESTAMP
        WHERE vendor_id = ?
        """,
        (vendor_id,),
    )
    conn.commit()

    row = conn.execute(
        "SELECT vendor_id, name, status, discontinued_on FROM vendors WHERE vendor_id = ?",
        (vendor_id,),
    ).fetchone()
    conn.close()

    return jsonify(dict(row))


@app.route("/api/vendors", methods=["GET"])
def get_vendors():
    """
    Optional query param:
      ?status=active | discontinued  -> filter by vendor status
    No params = everyone, same as before (nothing breaks for existing callers).
    """
    status = request.args.get("status")

    query = "SELECT vendor_id, name, status FROM vendors"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY name"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    vendors = [dict(row) for row in rows]
    return jsonify(vendors)


@app.route("/api/vendors", methods=["POST"])
def add_vendor():
    data = request.get_json(silent=True)

    if not data or not data.get("name") or not data["name"].strip():
        return jsonify({"error": "Vendor name is required"}), 400

    name = data["name"].strip()

    conn = get_db_connection()
    try:
        cur = conn.execute("INSERT INTO vendors (name) VALUES (?)", (name,))
        conn.commit()
        new_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": f"Vendor '{name}' already exists"}), 409

    row = conn.execute(
        "SELECT vendor_id, name, status FROM vendors WHERE vendor_id = ?", (new_id,)
    ).fetchone()
    conn.close()

    return jsonify(dict(row)), 201


@app.route("/api/contracts", methods=["GET"])
def get_contracts():
    """
    Day 9: optional query params, all combinable, all backward compatible
    (no params = every contract, exactly like before):
      ?type=License              -> exact match on contract_type
      ?vendor_id=3               -> contracts for one vendor
      ?status=active             -> filter by contract's app_status
      ?vendor_status=active      -> only contracts whose VENDOR is active
                                     (pass 'discontinued' to see only those)
      ?q=airtel                  -> free-text search - matches vendor name,
                                     contract type, details, PO number,
                                     master contract note, remarks, or status,
                                     so the user never has to say which field
                                     they mean.
    """
    contract_type = request.args.get("type")
    vendor_id = request.args.get("vendor_id")
    app_status = request.args.get("status")
    vendor_status = request.args.get("vendor_status")
    search = request.args.get("q")

    query = """
        SELECT c.contract_id, c.vendor_id, v.name AS vendor_name,
               c.contract_type, c.details, c.po_number, c.due_date, c.end_date,
               c.yearly_amount, c.procurement_status, c.master_contract_note, c.remarks
        FROM contracts c
        JOIN vendors v ON v.vendor_id = c.vendor_id
        WHERE 1=1
    """
    params = []

    if contract_type:
        query += " AND c.contract_type = ?"
        params.append(contract_type)
    if vendor_id:
        query += " AND c.vendor_id = ?"
        params.append(vendor_id)
    if app_status:
        query += " AND c.app_status = ?"
        params.append(app_status)
    if vendor_status:
        query += " AND v.status = ?"
        params.append(vendor_status)
    if search:
        query += """ AND (
            v.name LIKE ? OR c.contract_type LIKE ? OR c.details LIKE ? OR
            c.po_number LIKE ? OR c.master_contract_note LIKE ? OR
            c.remarks LIKE ? OR c.procurement_status LIKE ?
        )"""
        like_term = f"%{search}%"
        params.extend([like_term] * 7)

    query += " ORDER BY c.due_date IS NULL, c.due_date ASC"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    contracts = []
    for row in rows:
        contract = dict(row)
        days_remaining, color = compute_days_remaining_and_color(contract["due_date"])
        contract["days_remaining"] = days_remaining
        contract["color"] = color
        contracts.append(contract)

    return jsonify(contracts)


@app.route("/api/contracts/<int:contract_id>", methods=["GET"])
def get_contract(contract_id):
    
    conn = get_db_connection()
    row = conn.execute(
        """
        SELECT c.*, v.name AS vendor_name
        FROM contracts c
        JOIN vendors v ON v.vendor_id = c.vendor_id
        WHERE c.contract_id = ?
        """,
        (contract_id,),
    ).fetchone()
    conn.close()

    if row is None:
        return jsonify({"error": "Contract not found"}), 404

    contract = dict(row)
    days_remaining, color = compute_days_remaining_and_color(contract["due_date"])
    contract["days_remaining"] = days_remaining
    contract["color"] = color

    return jsonify(contract)


@app.route("/api/contracts", methods=["POST"])
def add_contract():
    
    data = request.get_json(silent=True) or {}

    vendor_id = data.get("vendor_id")
    if not vendor_id:
        return jsonify({"error": "vendor_id is required"}), 400

    conn = get_db_connection()

    vendor = conn.execute(
        "SELECT vendor_id FROM vendors WHERE vendor_id = ?", (vendor_id,)
    ).fetchone()
    if vendor is None:
        conn.close()
        return jsonify({"error": f"No vendor with vendor_id {vendor_id}"}), 404

    for date_field in DATE_FIELDS:
        if not is_valid_date(data.get(date_field)):
            conn.close()
            return jsonify({"error": f"{date_field} must be in YYYY-MM-DD format"}), 400

    if not is_valid_po_number(data.get("po_number")):
        conn.close()
        return jsonify({"error": "po_number must contain digits only, no letters"}), 400

    provided = {field: data[field] for field in CONTRACT_FIELDS if field in data}
    columns = ["vendor_id"] + list(provided.keys())
    values = [vendor_id] + list(provided.values())
    placeholders = ", ".join("?" for _ in columns)

    cur = conn.execute(
        f"INSERT INTO contracts ({', '.join(columns)}) VALUES ({placeholders})",
        values,
    )
    conn.commit()
    new_id = cur.lastrowid

    contract = fetch_full_contract(conn, new_id)
    conn.close()

    return jsonify(contract), 201


@app.route("/api/contracts/<int:contract_id>", methods=["PUT"])
def update_contract(contract_id):
    
    data = request.get_json(silent=True) or {}

    conn = get_db_connection()

    existing = conn.execute(
        "SELECT po_number, due_date, start_date FROM contracts WHERE contract_id = ?",
        (contract_id,),
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Contract not found"}), 404

    for date_field in DATE_FIELDS:
        if date_field in data and not is_valid_date(data.get(date_field)):
            conn.close()
            return jsonify({"error": f"{date_field} must be in YYYY-MM-DD format"}), 400

    if "po_number" in data and not is_valid_po_number(data.get("po_number")):
        conn.close()
        return jsonify({"error": "po_number must contain digits only, no letters"}), 400

    fields_to_update = {k: v for k, v in data.items() if k in CONTRACT_FIELDS}
    if not fields_to_update:
        conn.close()
        return jsonify({"error": "No valid fields provided to update"}), 400

    old_po = existing["po_number"]
    new_po = fields_to_update.get("po_number")
    if new_po is not None and old_po is not None and new_po != old_po:
        conn.execute(
            """
            INSERT INTO contract_history
                (contract_id, old_po_number, old_due_date, old_start_date, note)
            VALUES (?, ?, ?, ?, ?)
            """,
            (contract_id, old_po, existing["due_date"], existing["start_date"],
             data.get("history_note")),
        )

    set_clause = ", ".join(f"{field} = ?" for field in fields_to_update)
    values = list(fields_to_update.values()) + [contract_id]

    conn.execute(
        f"UPDATE contracts SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE contract_id = ?",
        values,
    )
    conn.commit()

    contract = fetch_full_contract(conn, contract_id)
    conn.close()

    return jsonify(contract)


@app.route("/api/contracts/<int:contract_id>/history", methods=["GET"])
def get_contract_history(contract_id):
    conn = get_db_connection()

    contract = conn.execute(
        "SELECT contract_id FROM contracts WHERE contract_id = ?", (contract_id,)
    ).fetchone()
    if contract is None:
        conn.close()
        return jsonify({"error": "Contract not found"}), 404

    rows = conn.execute(
        """
        SELECT history_id, old_po_number, old_due_date, old_start_date, changed_on, note
        FROM contract_history
        WHERE contract_id = ?
        ORDER BY changed_on DESC, history_id DESC
        """,
        (contract_id,),
    ).fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])


@app.route("/api/recipients", methods=["GET"])
def get_recipients():
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT recipient_id, email FROM recipients ORDER BY email"
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/recipients", methods=["POST"])
def add_recipient():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({"error": "Please enter a valid email address"}), 400

    conn = get_db_connection()
    try:
        cur = conn.execute("INSERT INTO recipients (email) VALUES (?)", (email,))
        conn.commit()
        new_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": f"'{email}' is already a recipient"}), 409

    row = conn.execute(
        "SELECT recipient_id, email FROM recipients WHERE recipient_id = ?", (new_id,)
    ).fetchone()
    conn.close()

    return jsonify(dict(row)), 201


@app.route("/api/recipients/<int:recipient_id>", methods=["DELETE"])
def delete_recipient(recipient_id):
    conn = get_db_connection()

    existing = conn.execute(
        "SELECT recipient_id FROM recipients WHERE recipient_id = ?", (recipient_id,)
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Recipient not found"}), 404

    conn.execute("DELETE FROM recipients WHERE recipient_id = ?", (recipient_id,))
    conn.commit()
    conn.close()

    return jsonify({"deleted": True})


@app.route("/api/digest-preview", methods=["GET"])
def digest_preview():
    
    from digest import build_digest_data
    return jsonify(build_digest_data())


def _send_digest_to_all_recipients():
   
    from digest import build_digest_data, render_digest_email
    from email_utils import send_email

    conn = get_db_connection()
    recipients = conn.execute("SELECT email FROM recipients").fetchall()
    conn.close()

    if not recipients:
        return 0, ["No recipients configured yet - add one on the Recipients page first."]

    html = render_digest_email(build_digest_data())

    failures = []
    sent_count = 0
    for row in recipients:
        success, error = send_email(row["email"], "Contract Renewal Digest", html)
        if success:
            sent_count += 1
        else:
            failures.append(f"{row['email']}: {error}")

    return sent_count, failures


@app.route("/api/send-test-email", methods=["POST"])
def send_test_email():
    
    sent_count, failures = _send_digest_to_all_recipients()

    if sent_count == 0 and failures:
        return jsonify({"error": failures[0]}), 400

    if failures:
        return jsonify({
            "sent": True,
            "recipient_count": sent_count,
            "warning": f"{len(failures)} failed: " + "; ".join(failures),
        })

    return jsonify({"sent": True, "recipient_count": sent_count})


def send_daily_digest_job():
    
    today_str = date.today().isoformat()

    conn = get_db_connection()
    already_sent = conn.execute(
        "SELECT 1 FROM digest_send_log WHERE sent_on = ?", (today_str,)
    ).fetchone()

    if already_sent:
        conn.close()
        print(f"[daily digest] already sent today ({today_str}), skipping.")
        return

    conn.close()

    sent_count, failures = _send_digest_to_all_recipients()
    print(f"[daily digest] sent to {sent_count} recipient(s).")
    for failure in failures:
        print(f"[daily digest] {failure}")

    if sent_count > 0:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO digest_send_log (sent_on, recipient_count) VALUES (?, ?)",
            (today_str, sent_count),
        )
        conn.commit()
        conn.close()


if __name__ == "__main__":
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler()
    scheduler.add_job(send_daily_digest_job, "cron", hour=8, minute=0)
    scheduler.start()
    print("Daily digest scheduler started - will run every day at 08:00.")

    
    app.run(debug=True, port=5000, use_reloader=False)