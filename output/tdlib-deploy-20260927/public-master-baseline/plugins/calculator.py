def _safe_eval(expr):
    allowed = set("0123456789+-*/(). %")
    if any(ch not in allowed for ch in expr):
        raise ValueError("Caracter no permitido")
    return eval(expr, {"__builtins__": {}}, {})


def handle_command(bot, cid, uid, text, rank):
    parts = text.strip().split(maxsplit=1)
    if not parts:
        return False
    cmd = parts[0].lower()
    if cmd not in ["/calc", "/math"]:
        return False
    if len(parts) < 2:
        bot.send_msg(cid, "Uso: /calc <expresion>. Ej: /calc (2+5)*3")
        return True
    expr = parts[1].strip()
    try:
        result = _safe_eval(expr)
        bot.send_msg(cid, f"Resultado: `{result}`")
    except Exception as e:
        bot.send_msg(cid, f"Error en expresion: {e}")
    return True
