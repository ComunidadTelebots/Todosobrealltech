#!/usr/bin/env python3
"""
Guardián de cupo de tráfico (Hostinger 8 TB/mes, cuenta TX+RX de todo el VPS).

Idea: mientras vas sobrado, velocidad completa (sin tc). Solo si el mes va camino
de pasarse del objetivo, aplica un tope global de EGRESO (tc HTB en eth0) calculado
para deslizarte por debajo del cupo en los días que quedan. Como el proxy es
simétrico, frenar TX arrastra RX por backpressure de TCP.

Barato en CPU: el tope solo existe cuando hace falta. Se auto-resetea cada mes.
Avisos por CintiaBot al 80% y 95%.
"""

import json
import os
import subprocess
import time
import datetime
import calendar
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

IFACE = os.environ.get("BW_IFACE", "eth0")
BUDGET_TB = float(os.environ.get("BW_BUDGET_TB", "8"))          # cupo (configurable)
TARGET_FRAC = float(os.environ.get("BW_TARGET_FRAC", "0.95"))   # aterrizar al 95%
ALERT_FRAC = float(os.environ.get("BW_ALERT_FRAC", "0.80"))     # avisar al 80%
CAP_DISABLE_ABOVE_MBIT = float(os.environ.get("BW_CAP_DISABLE_MBIT", "150"))
FLOOR_MBIT = float(os.environ.get("BW_FLOOR_MBIT", "25"))
STATE_FILE = os.environ.get("BW_STATE", "/var/lib/bw-budget-guard.json")
MASTER_ID = int(os.environ.get("BW_MASTER_ID", "0"))

# Tráfico del mes ya consumido ANTES de instalar vnstat (solo mes en curso).
BASELINE_MONTH = os.environ.get("BW_BASELINE_MONTH", "")
BASELINE_GB = float(os.environ.get("BW_BASELINE_GB", "0"))

TB = 1024 ** 4
GB = 1024 ** 3


def sh(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=15)


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(s):
    with open(STATE_FILE, "w") as f:
        json.dump(s, f)


def month_usage_bytes(now):
    """rx+tx del mes en curso según vnstat, + baseline del mes de instalación."""
    used = 0
    try:
        out = sh(["vnstat", "--json", "m", "-i", IFACE]).stdout
        data = json.loads(out)
        months = data["interfaces"][0]["traffic"]["month"]
        for m in months:
            d = m["date"]
            if d["year"] == now.year and d["month"] == now.month:
                used = int(m["rx"]) + int(m["tx"])
                break
    except Exception:
        used = 0
    key = f"{now.year:04d}-{now.month:02d}"
    if key == BASELINE_MONTH:
        used += int(BASELINE_GB * GB)
    return used


def seconds_left_in_month(now):
    last_day = calendar.monthrange(now.year, now.month)[1]
    end = datetime.datetime(now.year, now.month, last_day, 23, 59, 59)
    return max(1, int((end - now).total_seconds()))


def current_cap_mbit():
    out = sh(["tc", "qdisc", "show", "dev", IFACE]).stdout
    if "htb" not in out:
        return None
    cout = sh(["tc", "class", "show", "dev", IFACE]).stdout
    import re
    m = re.search(r"ceil (\d+)([KMG]?)bit", cout)
    if not m:
        return None
    val = float(m.group(1)); unit = m.group(2)
    return val * {"": 1e-6, "K": 1e-3, "M": 1, "G": 1e3}[unit]


def apply_cap(mbit):
    """Aplica/ajusta tope global de egreso a `mbit`."""
    out = sh(["tc", "qdisc", "show", "dev", IFACE]).stdout
    r = f"{int(mbit)}mbit"
    if "htb 1:" in out:
        sh(["tc", "class", "change", "dev", IFACE, "classid", "1:10", "htb",
            "rate", r, "ceil", r])
    else:
        sh(["tc", "qdisc", "add", "dev", IFACE, "root", "handle", "1:", "htb", "default", "10"])
        sh(["tc", "class", "add", "dev", IFACE, "parent", "1:", "classid", "1:10", "htb",
            "rate", r, "ceil", r])
        sh(["tc", "qdisc", "add", "dev", IFACE, "parent", "1:10", "handle", "10:", "fq_codel"])


def clear_cap():
    out = sh(["tc", "qdisc", "show", "dev", IFACE]).stdout
    if "htb 1:" in out:
        sh(["tc", "qdisc", "del", "dev", IFACE, "root"])


def telegram(text):
    try:
        token = json.load(open(os.environ.get("BOTS_JSON", "")))[0]["token"]
        data = urllib.parse.urlencode({"chat_id": MASTER_ID, "text": text, "parse_mode": "Markdown"}).encode()
        urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=data, timeout=12)
    except Exception:
        pass


def main(report=False):
    now = datetime.datetime.now()
    st = load_state()
    mkey = f"{now.year:04d}-{now.month:02d}"
    if st.get("month") != mkey:  # nuevo mes → reset
        st = {"month": mkey, "alert80": False, "alert95": False, "cap": None}
        clear_cap()

    used = month_usage_bytes(now)
    budget = BUDGET_TB * TB
    target = budget * TARGET_FRAC
    frac = used / budget
    secs_left = seconds_left_in_month(now)
    remaining = target - used

    # Proyección de fin de mes al ritmo actual del mes.
    start_of_month = datetime.datetime(now.year, now.month, 1)
    elapsed = max(1.0, (now - start_of_month).total_seconds())
    month_total = calendar.monthrange(now.year, now.month)[1] * 86400
    projected = used * month_total / elapsed

    # Solo se frena si la PROYECCIÓN supera el objetivo. Si no, plena velocidad.
    if projected <= target:
        decision = None
    else:
        sustainable_tx_mbit = (remaining * 8 / secs_left) / 2 / 1e6 if remaining > 0 else FLOOR_MBIT
        decision = max(FLOOR_MBIT, round(sustainable_tx_mbit))

    if report:
        print(f"Mes {mkey}: usado {used/TB:.3f} TB / {BUDGET_TB} TB ({frac*100:.1f}%)")
        print(f"Proyección fin de mes: {projected/TB:.2f} TB · objetivo {target/TB:.2f} TB · quedan {secs_left/86400:.1f} días")
        print(f"Tope actual: {current_cap_mbit()}")
        print(f"Decisión: {'SIN TOPE (plena velocidad)' if decision is None else f'tope {decision} Mbit'}")
        return

    # Aplicar decisión.
    prev = st.get("cap")
    if decision is None:
        if current_cap_mbit() is not None:
            clear_cap()
            telegram(f"✅ *Cupo Hostinger*: ritmo normalizado, quito el tope. Uso mes: {used/TB:.2f}/{BUDGET_TB} TB.")
        st["cap"] = None
    else:
        # Aplica si cambia >15% o no había tope.
        if prev is None or abs(decision - prev) / max(prev, 1) > 0.15:
            apply_cap(decision)
            telegram(f"🟠 *Cupo Hostinger*: aplico tope global de *{decision} Mbit* para no pasar de {BUDGET_TB} TB.\nUso mes: {used/TB:.2f} TB ({frac*100:.0f}%), quedan {secs_left/86400:.1f} días.")
        st["cap"] = decision

    # Avisos.
    if frac >= 0.95 and not st.get("alert95"):
        telegram(f"🔴 *Cupo Hostinger al {frac*100:.0f}%* ({used/TB:.2f}/{BUDGET_TB} TB). El guardián está frenando para no rebasar.")
        st["alert95"] = True
    elif frac >= ALERT_FRAC and not st.get("alert80"):
        telegram(f"🟡 *Cupo Hostinger al {frac*100:.0f}%* ({used/TB:.2f}/{BUDGET_TB} TB). Quedan {secs_left/86400:.1f} días del mes.")
        st["alert80"] = True

    save_state(st)


if __name__ == "__main__":
    import sys
    main(report="--report" in sys.argv)
