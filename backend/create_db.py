import sqlite3
import os

DB_PATH = "vendor_contracts.db"
SCHEMA_PATH = "schema.sql"


def create_database():
    if os.path.exists(DB_PATH):
        print(f"'{DB_PATH}' already exists — skipping. Delete the file first if you want a fresh, empty database.")
        return

    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()

    print(f"Done. Created '{DB_PATH}' with tables: vendors, contracts, contract_history")


if __name__ == "__main__":
    create_database()