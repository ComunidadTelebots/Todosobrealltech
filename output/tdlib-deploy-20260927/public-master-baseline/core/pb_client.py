"""
pb_client.py — Cliente mínimo de PocketBase (superuser) para moonbot.

Se usa como almacén ÚNICO del directorio de canales (registro, propiedad y
snapshots). Autentica como superusuario, cachea el token y reintenta una vez
ante 401. Sin dependencias externas (urllib).
"""

import json
import time
import threading
import urllib.request
import urllib.parse
import urllib.error


class PBError(Exception):
    pass


class PBClient:
    def __init__(self, base_url, email, password, log=None):
        self.base = base_url.rstrip("/")
        self._email = email
        self._password = password
        self._token = None
        self._token_ts = 0
        self._lock = threading.Lock()
        self._log = log or (lambda *a, **k: None)

    # ── HTTP ────────────────────────────────────────────────────────────────
    def _raw(self, method, path, body=None, token=None, timeout=15):
        url = self.base + path
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = token
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="ignore")[:300]
            raise PBError(f"{e.code} {method} {path}: {detail}")
        except Exception as e:
            raise PBError(f"{method} {path}: {e}")

    def _auth(self):
        with self._lock:
            if self._token and time.time() - self._token_ts < 1800:
                return self._token
            d = self._raw(
                "POST",
                "/api/collections/_superusers/auth-with-password",
                {"identity": self._email, "password": self._password},
            )
            self._token = d.get("token")
            self._token_ts = time.time()
            if not self._token:
                raise PBError("auth sin token")
            return self._token

    def _req(self, method, path, body=None):
        token = self._auth()
        try:
            return self._raw(method, path, body, token=token)
        except PBError as e:
            if str(e).startswith("401") or str(e).startswith("403"):
                # token caducado → re-autenticar una vez
                self._token = None
                token = self._auth()
                return self._raw(method, path, body, token=token)
            raise

    # ── Colecciones ─────────────────────────────────────────────────────────
    def ensure_collection(self, name, fields, indexes=None):
        """Crea la colección base si no existe (idempotente)."""
        try:
            self._req("GET", f"/api/collections/{name}")
            return False  # ya existía
        except PBError as e:
            if not str(e).startswith("404"):
                raise
        payload = {"name": name, "type": "base", "fields": fields}
        if indexes:
            payload["indexes"] = indexes
        self._req("POST", "/api/collections", payload)
        self._log("PB", f"colección creada: {name}")
        return True

    def ensure_field(self, collection, field):
        """Añade un campo a una colección existente si falta (migración suave)."""
        col = self._req("GET", f"/api/collections/{collection}")
        fields = col.get("fields", [])
        if any(f.get("name") == field["name"] for f in fields):
            return False
        fields.append(field)
        self._req("PATCH", f"/api/collections/{collection}", {"fields": fields})
        self._log("PB", f"campo añadido a {collection}: {field['name']}")
        return True

    # ── Registros ───────────────────────────────────────────────────────────
    def list(self, collection, filter=None, sort=None, per_page=200, page=1, expand=None):
        q = {"perPage": per_page, "page": page}
        if filter:
            q["filter"] = filter
        if sort:
            q["sort"] = sort
        if expand:
            q["expand"] = expand
        qs = urllib.parse.urlencode(q)
        return self._req("GET", f"/api/collections/{collection}/records?{qs}").get("items", [])

    def first(self, collection, filter):
        items = self.list(collection, filter=filter, per_page=1)
        return items[0] if items else None

    def create(self, collection, data):
        return self._req("POST", f"/api/collections/{collection}/records", data)

    def update(self, collection, rec_id, data):
        return self._req("PATCH", f"/api/collections/{collection}/records/{rec_id}", data)

    def delete(self, collection, rec_id):
        return self._req("DELETE", f"/api/collections/{collection}/records/{rec_id}")

    def upsert(self, collection, filter, data):
        """Actualiza el primer registro que casa con `filter`, o lo crea."""
        existing = self.first(collection, filter)
        if existing:
            return self.update(collection, existing["id"], data)
        return self.create(collection, data)

    @staticmethod
    def esc(v):
        """Escapa un valor para un filtro PB ('...')."""
        return str(v).replace("\\", "\\\\").replace("'", "\\'")
