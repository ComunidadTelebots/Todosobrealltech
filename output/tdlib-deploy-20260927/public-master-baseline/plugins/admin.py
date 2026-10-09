import psutil
import time
import json
from core.config import MASTER_ID

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()

    # Solo Master
    if str(uid) != str(MASTER_ID):
        return False
        
    if t_lower == "/sysinfo":
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        disk = psutil.disk_usage('/').percent
        bot.send_msg(cid, f"📊 **SYSINFO**\nCPU: `{cpu}%`\nRAM: `{ram}%`\nDISCO: `{disk}%`")
        return True
        
    elif t_lower == "/dbstats":
        from moon_multibot import db
        vistos_count = len(db.get("U_FILE", {}))
        official_count = len(db.get("CHANNELS", []))
        bot.send_msg(cid, f"🗃 **DB STATS**\nUsuarios/Grupos: `{vistos_count}`\nCanales Oficiales: `{official_count}`")
        return True
        
    elif t_lower == "/ping":
        start = time.time()
        res = bot.send_msg(cid, "🏓 Pong!")
        if res.get("ok"):
            msg_id = res["result"]["message_id"]
            ms = round((time.time() - start) * 1000)
            bot.api_call("editMessageText", {
                "chat_id": cid, 
                "message_id": msg_id, 
                "text": f"🏓 Pong! `{ms}ms`"
            })
        return True
        
    return False
