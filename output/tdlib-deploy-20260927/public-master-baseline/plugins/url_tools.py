import re


_URL_RE = re.compile(r"https?://[^\s]+", re.IGNORECASE)


def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()

    if low.startswith("/extracturls"):
        body = t[len("/extracturls"):].strip()
        if not body:
            bot.send_msg(cid, "Uso: /extracturls <texto>")
            return True
        urls = _URL_RE.findall(body)
        if not urls:
            bot.send_msg(cid, "No encontre URLs.")
            return True
        bot.send_msg(cid, "URLs encontradas:\n" + "\n".join(urls[:30]))
        return True

    if low.startswith("/domain"):
        body = t[len("/domain"):].strip()
        if not body:
            bot.send_msg(cid, "Uso: /domain <url>")
            return True
        m = re.match(r"^https?://([^/\s]+)", body, re.IGNORECASE)
        if not m:
            bot.send_msg(cid, "URL invalida.")
            return True
        bot.send_msg(cid, f"Dominio: `{m.group(1).lower()}`")
        return True

    return False
