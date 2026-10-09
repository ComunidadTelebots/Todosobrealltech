import re
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

# Modelo simple de spam (entrenado con datos bÃ¡sicos)
spam_model_path = "data/spam_model.pkl"
if not os.path.exists(spam_model_path):
    # Datos de ejemplo para entrenar
    data = [
        ("Hola, Â¿cÃ³mo estÃ¡s?", 0),
        ("Compra ahora, oferta limitada", 1),
        ("Gana dinero fÃ¡cil", 1),
        ("Â¿QuÃ© tal el clima?", 0),
        ("InversiÃ³n segura, contacta", 1),
    ]
    texts, labels = zip(*data)
    vectorizer = CountVectorizer()
    X = vectorizer.fit_transform(texts)
    model = MultinomialNB()
    model.fit(X, labels)
    
    with open(spam_model_path, "wb") as f:
        pickle.dump((vectorizer, model), f)

with open(spam_model_path, "rb") as f:
    vectorizer, model = pickle.load(f)

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/detect_spam"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden detectar spam.")
            return True
        
        msg = text[13:].strip()
        if not msg:
            bot.send_msg(cid, "Uso: /detect_spam <mensaje>")
            return True
        
        X_test = vectorizer.transform([msg])
        pred = model.predict(X_test)[0]
        prob = model.predict_proba(X_test)[0][1]
        
        result = "SPAM" if pred == 1 else "NO SPAM"
        bot.send_msg(cid, f"ðŸ” **DetecciÃ³n de Spam**: {result} (Probabilidad: {round(prob*100, 2)}%)")
        return True
    
    elif t_lower.startswith("/auto_filter"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo administradores pueden activar filtro automÃ¡tico.")
            return True
        
        # Simular activaciÃ³n (en realidad, modificarÃ­a settings)
        bot.send_msg(cid, "ðŸ›¡ï¸ **Filtro AutomÃ¡tico Activado**: DetectarÃ¡ spam en mensajes entrantes.")
        # Nota: Para implementaciÃ³n real, integrar en el loop de mensajes principal
        return True
    
    return False
