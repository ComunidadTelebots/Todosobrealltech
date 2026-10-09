#!/usr/bin/env python3
"""
parse_backups.py - Extrae el historial de mensajes de "Backup" del bot vía Telegram API.

Lee el BOT_TOKEN y el MASTER_ID desde .env, consulta la Telegram Bot API
(getUpdates) para recuperar los mensajes disponibles, filtra los que contienen
"Backup" y extrae de cada uno:
    - fecha del mensaje (timestamp de Telegram, en ISO 8601 UTC)
    - neuronas (línea "Neuronas: X")
    - hito 1B (línea "Hito 1B/12H: ...")

El resultado se guarda en scripts/backups_history.json, ordenado por fecha.

IMPORTANTE sobre getUpdates:
    getUpdates SOLO devuelve actualizaciones *entrantes* al bot (mensajes que le
    envían) y únicamente las que siguen en la cola del servidor de Telegram
    (retención ~24h, y se vacían al confirmar el offset). Los backups que el bot
    *envió* al Master NO aparecen aquí, porque la Bot API no expone el historial
    de mensajes salientes de un bot.

    Para recuperar backups históricos con este script, el Master debe *reenviar*
    esos mensajes de backup de vuelta al bot: al reenviarlos llegan como updates
    entrantes (conservando el caption y, en `forward_date`, la fecha original).

    Si no hay reenvíos, el script igualmente captura cualquier mensaje "Backup"
    presente en la ventana de getUpdates.

Uso:
    python scripts/parse_backups.py
    python scripts/parse_backups.py --token <BOT_TOKEN>   # override manual
    python scripts/parse_backups.py --all-chats           # no filtrar por MASTER_ID

NOTA: este script NO confirma el offset (no usa el parámetro `offset` para
purgar la cola), así que es seguro re-ejecutarlo sin perder updates pendientes
del bot en producción.
"""

import argparse
import datetime
import json
import os
import re
import sys

import requests
from dotenv import load_dotenv

# Rutas relativas a la raíz del proyecto (este script vive en scripts/)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Permite importar módulos del proyecto (token_manager) al ejecutar desde scripts/
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
OUTPUT_PATH = os.path.join(ROOT_DIR, "scripts", "backups_history.json")
BOT_STORE_PATH = os.path.join(ROOT_DIR, "data", "bots.json")

# Patrones de extracción sobre el texto / caption del mensaje
RE_NEURONAS = re.compile(r"Neuronas:\s*([\d.,\s]+)", re.IGNORECASE)
RE_HITO = re.compile(r"(Hito\s*1B[^\n\r]*)", re.IGNORECASE)


def load_bot_token(cli_token=None):
    """Obtiene el BOT_TOKEN: argumento CLI > .env > almacén cifrado data/bots.json."""
    if cli_token:
        return cli_token

    token = os.getenv("BOT_TOKEN")
    if token:
        return token

    # Fallback: el proyecto guarda los tokens cifrados en data/bots.json.
    # Tomamos el primer bot habilitado del almacén.
    try:
        from token_manager import token_manager
        bots = token_manager.load_bots_from_file(BOT_STORE_PATH, encrypted=True)
        for b in bots:
            if b.get("token") and b.get("enabled", True):
                print(f"[i] BOT_TOKEN no está en .env; usando bot '{b.get('name', '?')}' "
                      f"del almacén cifrado {BOT_STORE_PATH}")
                return b["token"]
    except Exception as e:
        print(f"[!] No se pudo leer el almacén de tokens: {e}")

    return None


def fetch_all_updates(token, timeout=30):
    """Drena getUpdates paginando por update_id SIN confirmar el offset.

    Avanzamos el `offset` localmente para paginar, pero nunca enviamos el offset
    final que purgaría la cola en el servidor de Telegram.
    """
    base = f"https://api.telegram.org/bot{token}"
    updates = []
    offset = None
    session = requests.Session()

    while True:
        params = {"timeout": 0, "limit": 100, "allowed_updates": []}
        if offset is not None:
            params["offset"] = offset

        try:
            resp = session.get(f"{base}/getUpdates", params=params, timeout=timeout)
            data = resp.json()
        except Exception as e:
            print(f"[!] Error consultando getUpdates: {e}")
            break

        if not data.get("ok"):
            print(f"[!] getUpdates devolvió error: {data.get('description')}")
            break

        batch = data.get("result", [])
        if not batch:
            break

        updates.extend(batch)
        # Paginamos hacia adelante; este offset es local, no se confirma al final.
        offset = batch[-1]["update_id"] + 1

        if len(batch) < 100:
            break

    return updates


def extract_message(update):
    """Devuelve el objeto mensaje de cualquier tipo de update relevante."""
    for key in ("message", "edited_message", "channel_post", "edited_channel_post"):
        if key in update:
            return update[key]
    return None


def message_date(msg):
    """Fecha del mensaje en UTC. Usa forward_date si es un reenvío (fecha original)."""
    ts = msg.get("forward_date") or msg.get("date")
    if ts is None:
        return None, None
    dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    return dt.isoformat(), ts


def parse_neuronas(text):
    """Extrae el número de neuronas de la línea 'Neuronas: X'."""
    m = RE_NEURONAS.search(text)
    if not m:
        return None
    raw = m.group(1).strip()
    digits = re.sub(r"[^\d]", "", raw)  # quita separadores de miles / espacios
    return int(digits) if digits else None


def parse_hito(text):
    """Extrae la línea del hito 1B (p.ej. 'Hito 1B/12H: 0.001% | en progreso')."""
    m = RE_HITO.search(text)
    return m.group(1).strip() if m else None


def main():
    parser = argparse.ArgumentParser(description="Extrae historial de backups vía Telegram API.")
    parser.add_argument("--token", help="BOT_TOKEN (override de .env / almacén cifrado).")
    parser.add_argument("--all-chats", action="store_true",
                        help="No filtrar por MASTER_ID; incluir backups de cualquier chat.")
    args = parser.parse_args()

    # Cargar .env desde la raíz del proyecto
    load_dotenv(os.path.join(ROOT_DIR, ".env"))

    token = load_bot_token(args.token)
    if not token:
        print("[X] No se encontró BOT_TOKEN (ni en --token, ni en .env, ni en data/bots.json).")
        sys.exit(1)

    master_id_raw = os.getenv("MASTER_ID")
    try:
        master_id = int(master_id_raw) if master_id_raw else None
    except ValueError:
        master_id = None
    if master_id is None and not args.all_chats:
        print("[!] MASTER_ID no definido en .env; se procesarán todos los chats.")
        args.all_chats = True

    print("[*] Consultando getUpdates...")
    updates = fetch_all_updates(token)
    print(f"[*] {len(updates)} updates recibidos.")

    seen = set()  # (chat_id, message_id) para deduplicar
    entries = []

    for upd in updates:
        msg = extract_message(upd)
        if not msg:
            continue

        # El texto del backup puede venir en .text o en el caption del documento
        text = msg.get("text") or msg.get("caption") or ""
        if "backup" not in text.lower():
            continue

        chat_id = (msg.get("chat") or {}).get("id")
        from_id = (msg.get("from") or {}).get("id")

        # Filtro por Master: el chat o el remitente debe coincidir con MASTER_ID
        if not args.all_chats and master_id is not None:
            if chat_id != master_id and from_id != master_id:
                continue

        dedup_key = (chat_id, msg.get("message_id"))
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        date_iso, date_unix = message_date(msg)

        entries.append({
            "message_id": msg.get("message_id"),
            "chat_id": chat_id,
            "date": date_iso,
            "date_unix": date_unix,
            "is_forwarded": bool(msg.get("forward_date") or msg.get("forward_origin")),
            "neuronas": parse_neuronas(text),
            "hito_1b": parse_hito(text),
            "text": text,
        })

    # Ordenar por fecha (las entradas sin fecha al final)
    entries.sort(key=lambda e: (e["date_unix"] is None, e["date_unix"] or 0))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"[OK] {len(entries)} backups extraídos -> {OUTPUT_PATH}")
    if not entries:
        print("[i] Sin resultados. Recuerda: getUpdates no expone los mensajes que")
        print("    el bot ENVIÓ. Reenvía los backups desde el Master al bot y reintenta.")


if __name__ == "__main__":
    main()
