from cryptography.fernet import Fernet
import os

# Generar clave si no existe
key_file = "data/encryption_key.key"
if not os.path.exists(key_file):
    key = Fernet.generate_key()
    with open(key_file, "wb") as f:
        f.write(key)
else:
    with open(key_file, "rb") as f:
        key = f.read()

cipher = Fernet(key)

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/encrypt"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden encriptar.")
            return True
        
        data = text[9:].strip()
        if not data:
            bot.send_msg(cid, "Uso: /encrypt <texto>")
            return True
        
        encrypted = cipher.encrypt(data.encode()).decode()
        bot.send_msg(cid, f"ðŸ” **Encriptado**: `{encrypted}`")
        return True
    
    elif t_lower.startswith("/decrypt"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden desencriptar.")
            return True
        
        data = text[9:].strip()
        if not data:
            bot.send_msg(cid, "Uso: /decrypt <texto encriptado>")
            return True
        
        try:
            decrypted = cipher.decrypt(data.encode()).decode()
            bot.send_msg(cid, f"ðŸ”“ **Desencriptado**: `{decrypted}`")
        except:
            bot.send_msg(cid, "âŒ Error: Texto no vÃ¡lido o clave incorrecta.")
        
        return True
    
    return False
