from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date, datetime
import sqlite3

app = Flask(__name__)
CORS(app)
DB_PATH = "vendor_contracts.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us read columns by name, e.g. row["name"]
    return conn
 
 
def compute_days_remaining_and_color(due_date_str):
    """
    Turns a due_date (stored as 'YYYY-MM-DD' text) into:
      - days_remaining: a plain number (negative means already overdue)
      - color: 'red' (overdue or due within 10 days), 'yellow' (11-20 days),
               'green' (more than 20
                 days away), or 'gray' (no due date set)
    These thresholds are a starting point — easy to tweak later once you and
    your guide agree on exact cutoffs.
    """
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
 
 
# Every field on a contract that's allowed to be set/changed through the API
# (vendor_id is handled separately - a contract can't switch vendors).
CONTRACT_FIELDS = [
    "contract_type", "details", "master_contract_note", "po_number",
    "start_date", "due_date", "yearly_amount", "pr_number",
    "procurement_status", "app_status", "remarks",
]
 
 
def is_valid_date(value):
    """None/missing is fine (both fields are nullable) - only a badly
    formatted string counts as invalid."""
    if value is None:
        return True
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False
 
 
def fetch_full_contract(conn, contract_id):
    """Shared by POST/PUT/GET-by-id: pulls one contract + its vendor name,
    with days_remaining/color attached."""
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
 
 
@app.route("/api/vendors", methods=["GET"])
def get_vendors():
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT vendor_id, name, status FROM vendors ORDER BY name"
    ).fetchall()
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
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT c.contract_id, c.vendor_id, v.name AS vendor_name,
               c.contract_type, c.details, c.po_number, c.due_date, c.yearly_amount
        FROM contracts c
        JOIN vendors v ON v.vendor_id = c.vendor_id
        ORDER BY c.due_date IS NULL, c.due_date ASC
        """
    ).fetchall()
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
 
    for date_field in ("start_date", "due_date"):
        if not is_valid_date(data.get(date_field)):
            conn.close()
            return jsonify({"error": f"{date_field} must be in YYYY-MM-DD format"}), 400
 
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
        "SELECT contract_id FROM contracts WHERE contract_id = ?", (contract_id,)
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Contract not found"}), 404
 
    for date_field in ("start_date", "due_date"):
        if date_field in data and not is_valid_date(data.get(date_field)):
            conn.close()
            return jsonify({"error": f"{date_field} must be in YYYY-MM-DD format"}), 400
 
    fields_to_update = {k: v for k, v in data.items() if k in CONTRACT_FIELDS}
    if not fields_to_update:
        conn.close()
        return jsonify({"error": "No valid fields provided to update"}), 400
 
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
 
 
if __name__ == "__main__":
    app.run(debug=True, port=5000)