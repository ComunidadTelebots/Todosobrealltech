from textblob import TextBlob

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/sentiment"):
        msg = text[10:].strip()
        if not msg:
            bot.send_msg(cid, "Uso: /sentiment <texto>")
            return True
        
        blob = TextBlob(msg)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        sentiment = "Neutral"
        if polarity > 0.1:
            sentiment = "Positivo"
        elif polarity < -0.1:
            sentiment = "Negativo"
        
        bot.send_msg(cid, f"ðŸ“Š **AnÃ¡lisis de Sentimiento**: {sentiment} (Polaridad: {round(polarity, 2)}, Subjetividad: {round(subjectivity, 2)})")
        return True
    
    elif t_lower == "/boost_learning":
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden boostear aprendizaje.")
            return True
        
        # Simular boost: Aprender frases positivas del historial
        from moon_multibot import db
        history = db.get("CHAT_HISTORY", {})
        positive_phrases = []
        for chat, msgs in history.items():
            for m in msgs[-10:]:  # Ãšltimos 10 mensajes
                txt = m.get("text", "")
                if txt and TextBlob(txt).sentiment.polarity > 0.1:
                    positive_phrases.append(txt)
        
        if positive_phrases:
            for p in positive_phrases[:5]:  # Limitar
                bot.ia.learn(p, source="Boost IA")
            bot.send_msg(cid, f"ðŸš€ **Aprendizaje Potenciado**: {len(positive_phrases)} frases positivas aprendidas.")
        else:
            bot.send_msg(cid, "âŒ No hay frases positivas recientes para aprender.")
        
        return True
    
    return False
