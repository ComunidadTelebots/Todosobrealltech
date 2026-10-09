"""
Ban Manager - gestion centralizada de baneos globales y locales.
"""

import datetime


class BanManager:
    """Gestiona baneos globales y baneos locales por grupo."""

    GLOBAL_KEY = "GLOBAL_BANS"
    HISTORY_KEY = "BAN_HISTORY"
    LEGACY_KEY = "ST_FILE"
    LOCAL_PREFIX = "BANS_"

    def __init__(self, db_manager):
        self.db = db_manager
        self.global_bans = set()
        self.load_from_db()

    def _normalize_uid(self, uid) -> str:
        return str(uid).strip()

    def _normalize_cid(self, cid) -> str:
        return str(cid).strip()

    def _empty_global(self) -> dict:
        return {"users": [], "hashes": []}

    def _empty_local(self) -> dict:
        return {"users": []}

    def _local_key(self, cid) -> str:
        return f"{self.LOCAL_PREFIX}{self._normalize_cid(cid)}"

    def _record(self, uid, reason, source, scope, cid=None, action="ban"):
        history = self.db.get(self.HISTORY_KEY, [])
        history.append({
            "uid": self._normalize_uid(uid),
            "cid": self._normalize_cid(cid) if cid is not None else None,
            "reason": reason,
            "source": source,
            "scope": scope,
            "action": action,
            "timestamp": datetime.datetime.now().isoformat(),
        })
        self.db.set(self.HISTORY_KEY, history[-1000:])

    def _global_data(self) -> dict:
        data = self.db.get(self.GLOBAL_KEY, self._empty_global())
        if not isinstance(data, dict):
            data = self._empty_global()
        data.setdefault("users", [])
        data.setdefault("hashes", [])
        return data

    def _legacy_users(self) -> list:
        legacy = self.db.get(self.LEGACY_KEY, {})
        if not isinstance(legacy, dict):
            return []
        users = legacy.get("bans", [])
        return [self._normalize_uid(uid) for uid in users if self._normalize_uid(uid)]

    def _remove_legacy_user(self, uid) -> None:
        uid_str = self._normalize_uid(uid)
        legacy = self.db.get(self.LEGACY_KEY, {})
        if not isinstance(legacy, dict) or "bans" not in legacy:
            return
        users = [self._normalize_uid(item) for item in legacy.get("bans", [])]
        if uid_str in users:
            legacy["bans"] = [item for item in users if item != uid_str]
            self.db.set(self.LEGACY_KEY, legacy)

    def load_from_db(self):
        """Carga baneos globales y migra en memoria los legacy de ST_FILE."""
        data = self._global_data()
        users = {self._normalize_uid(uid) for uid in data.get("users", []) if self._normalize_uid(uid)}
        legacy_users = set(self._legacy_users())
        merged = sorted(users | legacy_users)
        self.global_bans = set(merged)
        if merged != data.get("users", []):
            data["users"] = merged
            self.db.set(self.GLOBAL_KEY, data)

    def is_global_banned(self, uid) -> bool:
        return self._normalize_uid(uid) in self.global_bans

    def get_local_bans(self, cid) -> dict:
        data = self.db.get(self._local_key(cid), self._empty_local())
        if isinstance(data, list):
            data = {"users": data}
        if not isinstance(data, dict):
            data = self._empty_local()
        data.setdefault("users", [])
        data["users"] = [self._normalize_uid(uid) for uid in data["users"] if self._normalize_uid(uid)]
        return data

    def is_local_banned(self, cid, uid) -> bool:
        return self._normalize_uid(uid) in set(self.get_local_bans(cid).get("users", []))

    def is_banned(self, uid, cid=None) -> bool:
        if self.is_global_banned(uid):
            return True
        return cid is not None and self.is_local_banned(cid, uid)

    def ban_user(self, uid, reason="", source="manual") -> bool:
        """Banea un usuario globalmente en todos los grupos."""
        uid_str = self._normalize_uid(uid)
        if not uid_str:
            return False
        if uid_str in self.global_bans:
            return False

        self.global_bans.add(uid_str)
        data = self._global_data()
        if uid_str not in data["users"]:
            data["users"].append(uid_str)
        self.db.set(self.GLOBAL_KEY, data)
        self._record(uid_str, reason, source, scope="global")
        return True

    def ban_local_user(self, cid, uid, reason="", source="manual") -> bool:
        """Banea un usuario solo para un grupo concreto."""
        uid_str = self._normalize_uid(uid)
        cid_str = self._normalize_cid(cid)
        if not uid_str or not cid_str:
            return False

        data = self.get_local_bans(cid_str)
        if uid_str in data["users"]:
            return False

        data["users"].append(uid_str)
        self.db.set(self._local_key(cid_str), data)
        self._record(uid_str, reason, source, scope="local", cid=cid_str)
        return True

    def unban_user(self, uid) -> bool:
        uid_str = self._normalize_uid(uid)
        if uid_str not in self.global_bans:
            return False

        self.global_bans.discard(uid_str)
        data = self._global_data()
        if uid_str in data["users"]:
            data["users"].remove(uid_str)
        self.db.set(self.GLOBAL_KEY, data)
        self._remove_legacy_user(uid_str)
        self._record(uid_str, "Manual global unban", "manual", scope="global", action="unban")
        return True

    def unban_local_user(self, cid, uid) -> bool:
        uid_str = self._normalize_uid(uid)
        cid_str = self._normalize_cid(cid)
        data = self.get_local_bans(cid_str)
        if uid_str not in data["users"]:
            return False

        data["users"].remove(uid_str)
        self.db.set(self._local_key(cid_str), data)
        self._record(uid_str, "Manual local unban", "manual", scope="local", cid=cid_str, action="unban")
        return True

    def get_all_bans(self) -> dict:
        return self._global_data()

    def get_all_local_bans(self) -> dict:
        keys = self.db.keys(self.LOCAL_PREFIX) if hasattr(self.db, "keys") else []
        result = {}
        for key in keys:
            cid = key[len(self.LOCAL_PREFIX):]
            result[cid] = self.get_local_bans(cid).get("users", [])
        return result

    def get_ban_history(self, limit=100) -> list:
        history = self.db.get(self.HISTORY_KEY, [])
        return history[-limit:]

    def get_ban_stats(self) -> dict:
        global_data = self.get_all_bans()
        local_data = self.get_all_local_bans()
        history = self.get_ban_history(1000)

        sources = {}
        for record in history:
            source = record.get("source", "unknown")
            sources[source] = sources.get(source, 0) + 1

        now = datetime.datetime.now()
        recent = 0
        for record in history:
            try:
                if datetime.datetime.fromisoformat(record["timestamp"]) > now - datetime.timedelta(days=1):
                    recent += 1
            except Exception:
                pass

        return {
            "total_banned_users": len(global_data.get("users", [])),
            "total_local_banned_users": sum(len(users) for users in local_data.values()),
            "groups_with_local_bans": len([users for users in local_data.values() if users]),
            "total_banned_hashes": len(global_data.get("hashes", [])),
            "recent_bans": recent,
            "sources": sources,
        }

    def sync_with_cas(self, uid, cas_banned) -> bool:
        if cas_banned and not self.is_global_banned(uid):
            return self.ban_user(uid, reason="CAS global blacklist", source="cas")
        return False
