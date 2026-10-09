import datetime


class TelegramEventStore:
    def __init__(self, db, log_func):
        self.db = db
        self.log = log_func
        self.business_connections = db.get("BUSINESS_CONNECTIONS", {})

    def list_business_connections(self):
        return self.business_connections

    def record_managed_bot_update(self, update):
        managed = update.get("managed_bot")
        if not managed:
            return False
        events = self.db.get("MANAGED_BOT_UPDATES", [])
        events.append({
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "update": managed,
        })
        self.db.set("MANAGED_BOT_UPDATES", events[-100:])
        self.log("INFO", "Managed bot update recibido desde Telegram Bot API.")
        return True

    def record_business_update(self, update):
        conn = update.get("business_connection")
        if not conn:
            return False
        conn_id = conn.get("id")
        if conn_id:
            self.business_connections[conn_id] = conn
            self.db.set("BUSINESS_CONNECTIONS", self.business_connections)
        self.log("INFO", f"Business connection actualizada: {conn_id or 'sin id'}")
        return True
