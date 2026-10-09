import json

def handle_command(bot, cid, uid, text, rank):
    if str(rank).lower() not in ["admin", "master"]: return False
    t = text.split()
    cmd = t[0].lower()

    # /pin [mid] - Pin message
    if cmd == "/pin":
        mid = t[1] if len(t) > 1 else None
        if not mid: return bot.send_msg(cid, "âŒ Uso: /pin <message_id>")
        res = bot.pin_msg(cid, mid)
        if res.get("ok"): bot.send_msg(cid, "ðŸ“Œ Mensaje anclado.")
        return True

    # /unpin [mid] - Unpin message
    if cmd == "/unpin":
        mid = t[1] if len(t) > 1 else None
        res = bot.unpin_msg(cid, mid)
        if res.get("ok"): bot.send_msg(cid, "ðŸ“ Mensaje desanclado.")
        return True

    # /title <nuevo_titulo> - Change chat title
    if cmd == "/title":
        title = " ".join(t[1:])
        if not title: return bot.send_msg(cid, "âŒ Uso: /title <nuevo_nombre>")
        res = bot.set_title(cid, title)
        if res.get("ok"): bot.send_msg(cid, f"âœ… TÃ­tulo cambiado a: {title}")
        return True

    # /kick <uid> - Ban user
    if cmd == "/kick":
        target = t[1] if len(t) > 1 else None
        if not target: return bot.send_msg(cid, "âŒ Uso: /kick <user_id>")
        res = bot.kick_user(cid, target)
        if res.get("ok"): bot.send_msg(cid, f"ðŸš« Usuario {target} expulsado.")
        return True

    # /mute <uid> <minutos> - Mute user
    if cmd == "/mute":
        if len(t) < 3: return bot.send_msg(cid, "âŒ Uso: /mute <user_id> <minutos>")
        target, mins = t[1], int(t[2])
        import time
        until = int(time.time()) + (mins * 60)
        res = bot.restrict_user(cid, target, until=until)
        if res.get("ok"): bot.send_msg(cid, f"ðŸ”‡ Usuario {target} silenciado por {mins} min.")
        return True

    # /unmute <uid> - Unmute user
    if cmd == "/unmute":
        target = t[1] if len(t) > 1 else None
        if not target: return bot.send_msg(cid, "âŒ Uso: /unmute <user_id>")
        res = bot.restrict_user(cid, target, can_send=True)
        if res.get("ok"): bot.send_msg(cid, f"ðŸ”Š Usuario {target} puede hablar de nuevo.")
        return True

    # /promote <uid> - Promote to Admin
    if cmd == "/promote":
        target = t[1] if len(t) > 1 else None
        if not target: return bot.send_msg(cid, "âŒ Uso: /promote <user_id>")
        res = bot.promote_user(cid, target, is_admin=True)
        if res.get("ok"): bot.send_msg(cid, f"ðŸ›¡ï¸ Usuario {target} promovido a Admin.")
        return True

    # /demote <uid> - Remove Admin
    if cmd == "/demote":
        target = t[1] if len(t) > 1 else None
        if not target: return bot.send_msg(cid, "âŒ Uso: /demote <user_id>")
        res = bot.promote_user(cid, target, is_admin=False)
        if res.get("ok"): bot.send_msg(cid, f"ðŸ‘¤ Usuario {target} degradado a Miembro.")
        return True

    return False

