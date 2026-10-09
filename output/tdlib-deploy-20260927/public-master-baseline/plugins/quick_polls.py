def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    if not t.lower().startswith("/poll "):
        return False

    payload = t[6:].strip()
    parts = [x.strip() for x in payload.split("|") if x.strip()]
    if len(parts) < 3:
        bot.send_msg(cid, "Uso: /poll Pregunta | opcion1 | opcion2 [| opcion3 ...]")
        return True

    q = parts[0]
    opts = parts[1:8]
    if hasattr(bot, "send_msg"):
        body = [f"Encuesta: {q}", ""]
        for i, opt in enumerate(opts, start=1):
            body.append(f"{i}. {opt}")
        body.append("")
        body.append("Responde con el numero de opcion.")
        bot.send_msg(cid, "\n".join(body))
    return True
