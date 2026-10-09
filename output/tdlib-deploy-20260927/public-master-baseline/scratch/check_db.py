import sqlite3
import json

try:
    conn = sqlite3.connect('data/moon_database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM kv_store WHERE key='IA_BRAIN'")
    res = cursor.fetchone()
    if res:
        brain = json.loads(res[0])
        print(f"Keywords: {len(brain.get('keywords', {}))}")
    else:
        print("IA_BRAIN not found in database")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
