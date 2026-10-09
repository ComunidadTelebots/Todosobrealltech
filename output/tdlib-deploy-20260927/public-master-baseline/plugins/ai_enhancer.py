import openai
import json
from core.config import OPENAI_API_KEY

# Cargar lista blanca de APIs
try:
    with open("data/whitelist_apis.json", "r") as f:
        whitelist = json.load(f)
    allowed_apis = whitelist.get("allowed_apis", [])
except:
    allowed_apis = []

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/train_ai"):
        # Solo master puede usar para entrenar
        if rank.lower() != "master":
            bot.send_msg(cid, "❌ Solo el master puede entrenar la IA.")
            return True
        
        prompt = text[9:].strip()  # Remover /train_ai
        if not prompt:
            bot.send_msg(cid, "Uso: /train_ai <prompt para generar conocimiento>")
            return True
        
        if "openai" in allowed_apis:
            api_key = OPENAI_API_KEY
            if not api_key:
                bot.send_msg(cid, "❌ API key de OpenAI no configurada.")
                return True
            
            try:
                openai.api_key = api_key
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200
                )
                generated_text = response.choices[0].message.content.strip()
            except Exception as e:
                bot.send_msg(cid, f"❌ Error en OpenAI: {str(e)}")
                return True
        else:
            # Usar IA local para generar
            generated_text = bot.ia.generate(prompt)
        
        # Alimentar a la IA local
        bot.ia.learn(generated_text, source="Entrenamiento IA")
        bot.send_msg(cid, f"🧠 **IA Entrenada**: Generado y aprendido '{generated_text[:50]}...'")
        return True
    
    return False