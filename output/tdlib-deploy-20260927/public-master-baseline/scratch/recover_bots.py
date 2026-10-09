import sqlite3
import json
import os

db_path = 'data/moon_database.db'
bots_json_path = 'data/bots.json'

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT key FROM kv_store WHERE key LIKE 'CHATS_%'")
    tokens = [row[0].replace('CHATS_', '') for row in cursor.fetchall()]
    conn.close()

    if tokens:
        bots_data = [{"token": token} for token in tokens]
        os.makedirs('data', exist_ok=True)
        with open(bots_json_path, 'w') as f:
            json.dump(bots_data, f, indent=4)
        print(f"Created {bots_json_path} with {len(tokens)} tokens.")
    else:
        print("No tokens found in database.")
else:
    print(f"Database {db_path} not found.")
