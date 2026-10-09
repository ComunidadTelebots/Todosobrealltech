def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()

    if low.startswith("/upper "):
        bot.send_msg(cid, t[7:].upper())
        return True

    if low.startswith("/lower "):
        bot.send_msg(cid, t[7:].lower())
        return True

    if low.startswith("/reverse "):
        bot.send_msg(cid, t[9:][::-1])
        return True

    if low.startswith("/count "):
        body = t[7:]
        words = len([x for x in body.split() if x.strip()])
        chars = len(body)
        bot.send_msg(cid, f"Caracteres: `{chars}` | Palabras: `{words}`")
        return True

    return False
