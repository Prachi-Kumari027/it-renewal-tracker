from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)
DB_PATH = "vendor_contracts.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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


if __name__ == "__main__":
    app.run(debug=True, port=5000)