#!/usr/bin/env python3
"""
Aviso a Telegram (al master) con, POR CADA proxy mtproto: conexiones + ancho de
banda (Mbps/Gbps) en un mismo mensaje. Mide leyendo el netns de cada contenedor.
"""
import json
import os
import subprocess
import time
import urllib.request
import urllib.parse

# Carga scripts/.env (config; compatible con cron, que no hereda el entorno).
_envf = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_envf):
    for _l in open(_envf):
        _l = _l.strip()
        if _l and not _l.startswith("#") and "=" in _l:
            _k, _v = _l.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

MASTER_ID = int(os.environ.get("BW_MASTER_ID", "0"))
AGG_CAP_MBIT = 1000  # tope agregado por proxy (para el %)
CONN_STATS_FILE = os.path.join(os.environ.get("CONN_DATA_DIR", "/data"), "proxy-conn-stats.json")


def load_conn_stats():
    try:
        return json.load(open(CONN_STATS_FILE))
    except Exception:
        return {}

# contenedor -> (nombre, puerto), de MTPROTO_CONTAINERS en scripts/.env
PROXIES = {k: tuple(v) for k, v in json.loads(os.environ.get("MTPROTO_CONTAINERS", "{}")).items()}


def pid(c):
    try:
        return subprocess.run(["docker", "inspect", "-f", "{{.State.Pid}}", c],
                              capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""


def netstat_bytes(p):
    # /proc/net/dev SÍ respeta el netns con nsenter -n (a diferencia de /sys/class/net,
    # que se lee del mount del host y devolvería el eth0 del host para los tres).
    try:
        out = subprocess.run(["nsenter", "-t", p, "-n", "cat", "/proc/net/dev"],
                             capture_output=True, text=True, timeout=10).stdout
        for ln in out.splitlines():
            if "eth0:" in ln:
                nums = ln.split("eth0:")[1].split()
                return int(nums[8]), int(nums[0])  # tx_bytes, rx_bytes
    except Exception:
        pass
    return None, None


def established_443(p):
    try:
        out = subprocess.run(["nsenter", "-t", p, "-n", "sh", "-c",
                              "cat /proc/net/tcp /proc/net/tcp6"],
                             capture_output=True, text=True, timeout=10).stdout
        n = 0
        for ln in out.splitlines():
            f = ln.split()
            if len(f) < 4 or f[3] != "01":
                continue
            if f[1].split(":")[1].upper() == "01BB":  # :443
                n += 1
        return n
    except Exception:
        return 0


def gbps(mbps):
    return f"{mbps/1000:.2f} Gbps" if mbps >= 1000 else f"{mbps:.0f} Mbps"


def main():
    pids = {c: pid(c) for c in PROXIES}
    t0 = {c: netstat_bytes(pids[c]) for c in PROXIES}
    time.sleep(4)
    t1 = {c: netstat_bytes(pids[c]) for c in PROXIES}

    conn_stats = load_conn_stats()
    today = time.strftime("%Y-%m-%d", time.gmtime())

    lines = [
        "📡 *Estado proxies MTProto*",
        "_• Vivas ahora = conexiones abiertas en este momento_",
        "_• Total hoy = usuarios distintos que han usado el proxy hoy_",
        "",
    ]
    tot_live = tot_users_now = tot_today = 0
    tot_tx = tot_rx = 0.0
    for c, (name, port) in PROXIES.items():
        live = established_443(pids[c])                       # conexiones abiertas ahora
        cs = conn_stats.get(name, {})
        users_now = cs.get("activeNow", 0)                   # usuarios distintos ahora
        today_total = (cs.get("daily", {}) or {}).get(today, 0)  # usuarios distintos hoy
        tot_live += live
        tot_users_now += users_now
        tot_today += today_total
        (tx0, rx0), (tx1, rx1) = t0[c], t1[c]
        if None in (tx0, rx0, tx1, rx1):
            tx_mbps = rx_mbps = 0.0
        else:
            tx_mbps = (tx1 - tx0) * 8 / 4 / 1e6
            rx_mbps = (rx1 - rx0) * 8 / 4 / 1e6
        tot_tx += tx_mbps
        tot_rx += rx_mbps
        pct = min(100, tx_mbps / AGG_CAP_MBIT * 100)
        lines.append(f"🔹 *{name}* ({port})")
        lines.append(f"   🟢 Vivas ahora: *{live}* conexiones (≈{users_now} usuarios)")
        lines.append(f"   📅 Total hoy: *{today_total}* usuarios distintos")
        lines.append(f"   📶 ↑ {gbps(tx_mbps)} · ↓ {gbps(rx_mbps)}  (tope 1 Gbps · {pct:.0f}%)")
        lines.append("")

    lines.append(f"*Totales:* 🟢 {tot_live} vivas ({tot_users_now} usuarios) · 📅 {tot_today} hoy")
    lines.append(f"📶 ↑ {gbps(tot_tx)} ↓ {gbps(tot_rx)}")
    lines.append("_Límites: 10 Mbps/conexión · 1 Gbps/proxy_")
    msg = "\n".join(lines)

    token = json.load(open(os.environ.get("BOTS_JSON", "")))[0]["token"]
    data = urllib.parse.urlencode({"chat_id": MASTER_ID, "text": msg, "parse_mode": "Markdown"}).encode()
    try:
        r = json.load(urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=data, timeout=12))
        print("enviado:", r.get("ok"), "mid:", r.get("result", {}).get("message_id"))
    except Exception as e:
        print("error envío:", e)
    print(msg)


if __name__ == "__main__":
    main()
