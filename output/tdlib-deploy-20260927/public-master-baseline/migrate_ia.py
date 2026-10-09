import sqlite3, json, os

def migrate():
    print("🧠 Iniciando migración de memoria IA...")
    db_path = "data/moon_database.db"
    if not os.path.exists("data"): os.makedirs("data")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)")

    # 1. Migrar desde brain.json
    if os.path.exists("brain.json"):
        try:
            with open("brain.json", "r", encoding="utf-8") as f:
                brain_data = json.load(f)
                cursor.execute("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", ("IA_BRAIN", json.dumps(brain_data)))
                print("✅ brain.json migrado con éxito.")
                os.rename("brain.json", "brain.json.bak")
        except Exception as e:
            print(f"❌ Error migrando brain.json: {e}")

    # 2. Migrar desde knowledge.json
    if os.path.exists("knowledge.json"):
        try:
            with open("knowledge.json", "r", encoding="utf-8") as f:
                k_data = json.load(f)
                cursor.execute("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", ("IA_KNOWLEDGE", json.dumps(k_data)))
                print("✅ knowledge.json migrado con éxito.")
                os.rename("knowledge.json", "knowledge.json.bak")
        except Exception as e:
            print(f"❌ Error migrando knowledge.json: {e}")

    conn.commit()
    conn.close()
    print("🏁 Migración de IA completada.")

if __name__ == "__main__":
    migrate()
