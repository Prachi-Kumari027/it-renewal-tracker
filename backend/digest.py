from app import get_db_connection, compute_days_remaining_and_color


def build_digest_data():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT c.contract_id, c.vendor_id, v.name AS vendor_name,
               c.contract_type, c.details, c.po_number, c.due_date,
               c.yearly_amount, c.master_contract_note, c.procurement_status,
               c.remarks
        FROM contracts c
        JOIN vendors v ON v.vendor_id = c.vendor_id
        WHERE v.status = 'active'
        ORDER BY c.due_date IS NULL, c.due_date ASC
        """
    ).fetchall()
    conn.close()

    grouped = {"red": [], "yellow": [], "green": [], "gray": []}

    for row in rows:
        contract = dict(row)
        days_remaining, color = compute_days_remaining_and_color(contract["due_date"])
        contract["days_remaining"] = days_remaining
        grouped[color].append(contract)

    return grouped


if __name__ == "__main__":
    import json
    print(json.dumps(build_digest_data(), indent=2, default=str))