def handle_command(bot, cid, uid, text, rank):
    low = text.strip().lower()
    if low != "/id":
        return False
    bot.send_msg(cid, f"chat_id: `{cid}`\nuser_id: `{uid}`")
    return True
