import threading
import time


def _remind_later(bot, cid, uid, secs, msg):
    time.sleep(secs)
    bot.send_msg(cid, f"Recordatorio para {uid}: {msg}")


def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    if not t.lower().startswith("/remind "):
        return False

    body = t[8:].strip()
    parts = body.split(maxsplit=1)
    if len(parts) < 2 or not parts[0].isdigit():
        bot.send_msg(cid, "Uso: /remind <segundos> <mensaje>")
        return True

    secs = max(1, min(86400, int(parts[0])))
    msg = parts[1].strip()
    threading.Thread(target=_remind_later, args=(bot, cid, uid, secs, msg), daemon=True).start()
    bot.send_msg(cid, f"Recordatorio programado en {secs}s.")
    return True
