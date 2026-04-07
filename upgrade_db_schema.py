import sqlite3
import os

DB_PATH = "trading_bot.db"

def upgrade():
    if not os.path.exists(DB_PATH):
        print("Database not found. Skipping manual upgrade.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Upgrading database schema for Phase 3...")

    # Tables to add user_id to
    tables_to_fix = ["trades", "portfolio", "signals", "bot_settings"]
    
    for table in tables_to_fix:
        try:
            # Check if user_id already exists
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in cursor.fetchall()]
            
            if "user_id" not in columns:
                print(f"Adding user_id column to {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)")
            else:
                print(f"user_id already exists in {table}.")
        except Exception as e:
            print(f"Error updating {table}: {e}")

    # Add acted_on to signals if missing
    try:
        cursor.execute("PRAGMA table_info(signals)")
        columns = [col[1] for col in cursor.fetchall()]
        if "acted_on" not in columns:
            print("Adding acted_on column to signals...")
            cursor.execute("ALTER TABLE signals ADD COLUMN acted_on BOOLEAN DEFAULT 0")
    except Exception as e:
        print(f"Error updating signals: {e}")

    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade()
