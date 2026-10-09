#!/usr/bin/env python3
"""
backfill_channels.py — Dispara el backfill de canales del directorio.

Registra en PocketBase los canales/grupos donde @CintiaBot YA es admin de antes
(sin update my_chat_member capturado), cruzando getChatAdministrators para
detectar creator/administradores. El trabajo pesado ocurre dentro del proceso
moonbot (donde viven los tokens de los bots); este script solo lo lanza.

Uso:
    python3 scripts/backfill_channels.py [BASE_URL]
    # BASE_URL por defecto: http://localhost:5000
Requiere WEB_PASSWORD en el entorno o en .env.
"""
import os
import sys
import json
import urllib.request

from dotenv import load_dotenv

load_dotenv()

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000").rstrip("/")
PW = os.getenv("WEB_PASSWORD", "")


def post(path, body, token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def main():
    if not PW:
        sys.exit("Falta WEB_PASSWORD en el entorno / .env")
    tok = post("/api/login", {"password": PW}).get("token")
    if not tok:
        sys.exit("Login fallido (WEB_PASSWORD incorrecta)")
    res = post("/api/admin/channels/backfill", {}, token=tok)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
