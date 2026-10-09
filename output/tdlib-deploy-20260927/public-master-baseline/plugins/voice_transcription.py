import speech_recognition as sr
import requests
import os
import json

# Cargar lista blanca de APIs
try:
    with open("data/whitelist_apis.json", "r") as f:
        whitelist = json.load(f)
    allowed_apis = whitelist.get("allowed_apis", [])
except:
    allowed_apis = []

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/transcribe"):
        file_id = text[12:].strip()
        if not file_id:
            bot.send_msg(cid, "Uso: /transcribe <file_id> (obtén el file_id de un mensaje de voz)")
            return True
        
        if "google_speech" in allowed_apis:
            try:
                # Obtener file path de Telegram
                file_info = bot.api_call("getFile", {"file_id": file_id})
                if not file_info.get("ok"):
                    bot.send_msg(cid, "❌ Error obteniendo archivo de Telegram.")
                    return True
                
                file_path = file_info["result"]["file_path"]
                download_url = f"https://api.telegram.org/file/bot{bot.token}/{file_path}"
                
                # Descargar archivo
                response = requests.get(download_url)
                if response.status_code != 200:
                    bot.send_msg(cid, "❌ Error descargando archivo.")
                    return True
                
                temp_file = "temp_voice.ogg"
                with open(temp_file, "wb") as f:
                    f.write(response.content)
                
                # Transcribir
                recognizer = sr.Recognizer()
                with sr.AudioFile(temp_file) as source:
                    audio = recognizer.record(source)
                    try:
                        text_transcribed = recognizer.recognize_google(audio, language="es-ES")  # Español por defecto
                        bot.send_msg(cid, f"🎙️ **Transcripción:** {text_transcribed}")
                        # Opcional: Aprender en IA
                        bot.ia.learn(text_transcribed, source="Transcripción Voz")
                    except sr.UnknownValueError:
                        bot.send_msg(cid, "❌ No se pudo transcribir el audio.")
                    except sr.RequestError:
                        bot.send_msg(cid, "❌ Error en el servicio de transcripción.")
                
                # Limpiar
                os.remove(temp_file)
            except Exception as e:
                bot.send_msg(cid, f"❌ Error: {str(e)}")
        else:
            # Simulación local
            import random
            trans = "Parece que estás hablando de " + random.choice(["tecnología", "el grupo", "el bot", "la luna"])
            bot.send_msg(cid, f"🎙️ **Transcripción (Simulada):** {trans}")
            bot.ia.learn(trans, source="Transcripción Voz Simulada")
        
        return True
    
    return False