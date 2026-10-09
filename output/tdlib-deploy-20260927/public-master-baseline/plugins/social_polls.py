import json

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/create_poll"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden crear encuestas.")
            return True
        
        parts = text[13:].strip().split(" | ")
        if len(parts) < 3:
            bot.send_msg(cid, "Uso: /create_poll <pregunta> | <opciÃ³n1> | <opciÃ³n2> | ...")
            return True
        
        question = parts[0]
        options = parts[1:]
        
        poll_id = f"poll_{cid}_{len(bot.db.get('POLLS', {}))}"
        poll = {
            "question": question,
            "options": {opt: [] for opt in options},  # Lista de voters
            "creator": uid,
            "chat": cid
        }
        
        polls = bot.db.get("POLLS", {})
        polls[poll_id] = poll
        bot.db.set("POLLS", polls)
        
        options_text = "\n".join([f"{i+1}. {opt}" for i, opt in enumerate(options)])
        bot.send_msg(cid, f"ðŸ“Š **Encuesta Creada**: {question}\n{options_text}\n\nVota con /vote {poll_id} <nÃºmero>")
        return True
    
    elif t_lower.startswith("/vote"):
        parts = text[6:].strip().split()
        if len(parts) < 2:
            bot.send_msg(cid, "Uso: /vote <poll_id> <nÃºmero_opciÃ³n>")
            return True
        
        poll_id = parts[0]
        try:
            option_num = int(parts[1]) - 1
        except:
            bot.send_msg(cid, "NÃºmero de opciÃ³n invÃ¡lido.")
            return True
        
        polls = bot.db.get("POLLS", {})
        if poll_id not in polls:
            bot.send_msg(cid, "Encuesta no encontrada.")
            return True
        
        poll = polls[poll_id]
        if cid != poll["chat"]:
            bot.send_msg(cid, "Esta encuesta no es para este chat.")
            return True
        
        options = list(poll["options"].keys())
        if option_num < 0 or option_num >= len(options):
            bot.send_msg(cid, "OpciÃ³n invÃ¡lida.")
            return True
        
        opt = options[option_num]
        if uid in poll["options"][opt]:
            bot.send_msg(cid, "Ya votaste por esta opciÃ³n.")
            return True
        
        # Remover voto anterior si existe
        for o in poll["options"]:
            if uid in poll["options"][o]:
                poll["options"][o].remove(uid)
        
        poll["options"][opt].append(uid)
        polls[poll_id] = poll
        bot.db.set("POLLS", polls)
        
        bot.send_msg(cid, f"âœ… Voto registrado para '{opt}' en {poll_id}")
        return True
    
    elif t_lower.startswith("/poll_results"):
        poll_id = text[14:].strip()
        if not poll_id:
            bot.send_msg(cid, "Uso: /poll_results <poll_id>")
            return True
        
        polls = bot.db.get("POLLS", {})
        if poll_id not in polls:
            bot.send_msg(cid, "Encuesta no encontrada.")
            return True
        
        poll = polls[poll_id]
        results = []
        for opt, voters in poll["options"].items():
            results.append(f"{opt}: {len(voters)} votos")
        
        bot.send_msg(cid, f"ðŸ“Š **Resultados de {poll_id}**: {poll['question']}\n" + "\n".join(results))
        return True
    
    return False
