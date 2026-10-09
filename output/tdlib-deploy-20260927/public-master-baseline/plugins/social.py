import os
import json
import random

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    user_id = str(uid)
    
    # DB access helper (using bot.db if available, but bot uses global db internally)
    # We will assume bot has access to the internal storage through some proxy or we use files
    
    if t_lower == "/perfil":
        from moon_multibot import db
        data = db.get(f"USER_{user_id}", {"karma": 0, "level": 1, "exp": 0, "titles": []})
        titles = ", ".join(data["titles"]) if data["titles"] else "Novato"
        bot.send_msg(cid, f"👤 **PERFIL DE USUARIO**\n\n⭐ Karma: `{data['karma']}`\n🆙 Nivel: `{data['level']}`\n📊 EXP: `{data['exp']}/100`\n🏅 Títulos: `{titles}`")
        return True
        
    elif t_lower == "/shop":
        bot.send_msg(cid, "🏪 **MOON SHOP**\n\n1. `Título: VIP` - 500 Karma\n2. `Título: Legend` - 1000 Karma\n3. `Booster EXP` - 200 Karma\n\nUsa `/buy [ID]` para comprar.")
        return True
        
    elif t_lower.startswith("/buy"):
        from moon_multibot import db
        item = t_lower.split()[-1]
        data = db.get(f"USER_{user_id}", {"karma": 0, "level": 1, "exp": 0, "titles": []})
        
        if item == "1" and data["karma"] >= 500:
            data["karma"] -= 500
            data["titles"].append("VIP")
            bot.send_msg(cid, "✅ ¡Has comprado el título **VIP**! 💎")
        elif item == "2" and data["karma"] >= 1000:
            data["karma"] -= 1000
            data["titles"].append("Legend")
            bot.send_msg(cid, "✅ ¡Has comprado el título **Legend**! 👑")
        else:
            bot.send_msg(cid, "❌ No tienes suficiente Karma o el ID es inválido.")
        
        db.set(f"USER_{user_id}", data)
        return True

    return False
