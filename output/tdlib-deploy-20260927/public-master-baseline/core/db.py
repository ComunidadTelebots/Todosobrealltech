import json
import sqlite3
import threading

from .config import DB_PATH


class DBManager:
    def __init__(self, db_path=DB_PATH):
        self._db_path = db_path
        self._local = threading.local()
        self.lock = threading.Lock()
        # Inicializar tabla y habilitar WAL en la conexión principal
        conn = self._conn()
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)")
        conn.commit()

    def _conn(self):
        if not getattr(self._local, "conn", None):
            self._local.conn = sqlite3.connect(self._db_path, check_same_thread=False)
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA synchronous=NORMAL")
        return self._local.conn

    def get(self, key, default=None):
        with self.lock:
            cur = self._conn().execute("SELECT value FROM kv_store WHERE key=?", (key,))
            res = cur.fetchone()
            return json.loads(res[0]) if res else default

    def set(self, key, value):
        with self.lock:
            conn = self._conn()
            conn.execute("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", (key, json.dumps(value)))
            conn.commit()

    def delete(self, key):
        with self.lock:
            conn = self._conn()
            conn.execute("DELETE FROM kv_store WHERE key=?", (key,))
            conn.commit()

    def keys(self, prefix=None):
        with self.lock:
            if prefix is None:
                cur = self._conn().execute("SELECT key FROM kv_store")
            else:
                cur = self._conn().execute("SELECT key FROM kv_store WHERE key LIKE ?", (f"{prefix}%",))
            return [row[0] for row in cur.fetchall()]
