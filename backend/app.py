from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date, datetime
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
        "SELECT c.*, v.name AS vendor_name FROM contracts c JOIN vendors v ON v.vendor_id = c.vendor_id WHERE c.contract_id = ?",
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)