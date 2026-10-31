import sqlite3

def migrate():
    conn = sqlite3.connect("backend/avertiq.db")
    cursor = conn.cursor()

    def add_col_if_missing(table, col, defn):
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [r[1] for r in cursor.fetchall()]
        if col not in cols:
            print(f"Adding {col} to {table}")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")

    add_col_if_missing("incidents", "estimated_response_minutes", "INTEGER")
    add_col_if_missing("incidents", "expected_arrival_at", "TIMESTAMP")
    add_col_if_missing("incidents", "assigned_coordinator_id", "VARCHAR(100)")
    add_col_if_missing("incidents", "response_team_name", "VARCHAR(255)")
    add_col_if_missing("incidents", "response_notes", "TEXT")
    add_col_if_missing("incidents", "response_status", "VARCHAR(50) DEFAULT 'received'")
    add_col_if_missing("incidents", "is_demo", "BOOLEAN DEFAULT 0")

    add_col_if_missing("reports", "is_demo", "BOOLEAN DEFAULT 0")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incident_eta_history (
        id VARCHAR(36) PRIMARY KEY,
        incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        changed_by VARCHAR(255) NOT NULL,
        old_eta_minutes INTEGER,
        new_eta_minutes INTEGER,
        expected_arrival_at TIMESTAMP,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        response_team_name VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()
    print("Database migration applied successfully!")

if __name__ == "__main__":
    migrate()

