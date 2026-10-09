def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()
    if not (low.startswith("/note") or low.startswith("/notes")):
        return False

    from moon_multibot import db

    key = f"PLUGIN_NOTES_{cid}"
    notes = db.get(key, [])

    if low == "/notes":
        if not notes:
            bot.send_msg(cid, "No hay notas.")
            return True
        lines = [f"{i+1}. {n}" for i, n in enumerate(notes[-20:])]
        bot.send_msg(cid, "Notas:\n" + "\n".join(lines))
        return True

    parts = t.split(maxsplit=2)
    if len(parts) < 2:
        bot.send_msg(cid, "Uso: /note add <texto> | /note del <num>")
        return True

    action = parts[1].lower()
    if action == "add":
        if len(parts) < 3:
            bot.send_msg(cid, "Uso: /note add <texto>")
            return True
        notes.append(parts[2].strip())
        db.set(key, notes[-200:])
        bot.send_msg(cid, "Nota guardada.")
        return True

    if action == "del":
        if len(parts) < 3 or not parts[2].strip().isdigit():
            bot.send_msg(cid, "Uso: /note del <num>")
            return True
        idx = int(parts[2].strip()) - 1
        if idx < 0 or idx >= len(notes):
            bot.send_msg(cid, "Indice invalido.")
            return True
        removed = notes.pop(idx)
        db.set(key, notes)
        bot.send_msg(cid, f"Nota eliminada: {removed[:40]}")
        return True

    bot.send_msg(cid, "Uso: /note add <texto> | /note del <num>")
    return True
