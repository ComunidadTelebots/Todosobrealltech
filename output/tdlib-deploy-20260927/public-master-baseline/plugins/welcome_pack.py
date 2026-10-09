def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()
    if not (low.startswith("/setwelcome ") or low == "/welcome"):
        return False

    from moon_multibot import db

    key = f"PLUGIN_WELCOME_{cid}"
    if low == "/welcome":
        msg = db.get(key, "Bienvenido al grupo.")
        bot.send_msg(cid, f"Mensaje actual:\n{msg}")
        return True

    if str(rank).lower() not in ["admin", "master"]:
        bot.send_msg(cid, "Solo admins pueden cambiar el mensaje.")
        return True

    new_msg = t[len("/setwelcome "):].strip()
    if not new_msg:
        bot.send_msg(cid, "Uso: /setwelcome <mensaje>")
        return True
    db.set(key, new_msg)
    bot.send_msg(cid, "Mensaje de bienvenida actualizado.")
    return True

