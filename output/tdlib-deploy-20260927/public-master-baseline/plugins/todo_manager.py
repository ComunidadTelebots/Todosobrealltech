def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()
    if not (low.startswith("/todo") or low == "/todos"):
        return False

    from moon_multibot import db

    key = f"PLUGIN_TODO_{cid}_{uid}"
    todos = db.get(key, [])

    if low == "/todos":
        if not todos:
            bot.send_msg(cid, "No tienes tareas.")
            return True
        lines = [f"{i+1}. {x}" for i, x in enumerate(todos[:50])]
        bot.send_msg(cid, "Tus tareas:\n" + "\n".join(lines))
        return True

    parts = t.split(maxsplit=2)
    if len(parts) < 2:
        bot.send_msg(cid, "Uso: /todo add <tarea> | /todo done <num> | /todos")
        return True
    action = parts[1].lower()
    if action == "add":
        if len(parts) < 3:
            bot.send_msg(cid, "Uso: /todo add <tarea>")
            return True
        todos.append(parts[2].strip())
        db.set(key, todos[-100:])
        bot.send_msg(cid, "Tarea agregada.")
        return True
    if action == "done":
        if len(parts) < 3 or not parts[2].isdigit():
            bot.send_msg(cid, "Uso: /todo done <num>")
            return True
        idx = int(parts[2]) - 1
        if idx < 0 or idx >= len(todos):
            bot.send_msg(cid, "Indice invalido.")
            return True
        done = todos.pop(idx)
        db.set(key, todos)
        bot.send_msg(cid, f"Completada: {done[:40]}")
        return True
    bot.send_msg(cid, "Uso: /todo add <tarea> | /todo done <num> | /todos")
    return True
