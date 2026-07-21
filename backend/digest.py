import os
from datetime import date

import chevron

from app import get_db_connection, compute_days_remaining_and_color

TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "email-template.html"
)


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


def _format_date_display(iso_date):
    
    if not iso_date:
        return "N/A"
    year, month, day = iso_date.split("-")
    return f"{day}-{month}-{year}"


def render_digest_email(grouped_data):
    
    def rows_for(contracts):
        return [
            {
                "vendor_name": c["vendor_name"],
                "contract_type": c["contract_type"] or "N/A",
                "po_number": c["po_number"] or "N/A",
                "due_date": _format_date_display(c["due_date"]),
            }
            for c in contracts
        ]

    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = f.read()

    context = {
        "today_date": date.today().strftime("%d-%m-%Y"),
        "red_contracts": rows_for(grouped_data["red"]),
        "yellow_contracts": rows_for(grouped_data["yellow"]),
        "green_contracts": rows_for(grouped_data["green"]),
    }

    return chevron.render(template, context)


if __name__ == "__main__":
    import json
    print(json.dumps(build_digest_data(), indent=2, default=str))