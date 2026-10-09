import pytesseract
from PIL import Image
import requests
import io

def handle_command(bot, cid, uid, text, rank):
    t_lower = text.lower()
    
    if t_lower.startswith("/analyze_image"):
        file_id = text[15:].strip()
        if not file_id:
            bot.send_msg(cid, "Uso: /analyze_image <file_id> (obtén el file_id de una imagen)")
            return True
        
        try:
            # Obtener file path de Telegram
            file_info = bot.api_call("getFile", {"file_id": file_id})
            if not file_info.get("ok"):
                bot.send_msg(cid, "❌ Error obteniendo imagen de Telegram.")
                return True
            
            file_path = file_info["result"]["file_path"]
            download_url = f"https://api.telegram.org/file/bot{bot.token}/{file_path}"
            
            # Descargar imagen
            response = requests.get(download_url)
            if response.status_code != 200:
                bot.send_msg(cid, "❌ Error descargando imagen.")
                return True
            
            # Abrir imagen con PIL
            image = Image.open(io.BytesIO(response.content))
            
            # Extraer texto con OCR
            extracted_text = pytesseract.image_to_string(image, lang='spa+eng').strip()
            
            if extracted_text:
                # Usar IA local para interpretar el texto extraído
                prompt = f"Analiza este texto extraído de una imagen y describe qué podría representar la imagen: {extracted_text}"
                description = bot.ia.generate(prompt)
                bot.send_msg(cid, f"🖼️ **Análisis de Imagen (OCR + IA Local):** Texto extraído: '{extracted_text}'. Descripción: {description}")
            else:
                # Si no hay texto, generar descripción genérica con IA local
                prompt = "Describe una imagen genérica que no tiene texto visible, basada en objetos comunes."
                description = bot.ia.generate(prompt)
                bot.send_msg(cid, f"🖼️ **Análisis de Imagen (IA Local):** No se detectó texto. Descripción posible: {description}")
            
            # Aprender en IA local
            bot.ia.learn(extracted_text or "Imagen sin texto detectable", source="Análisis Imagen")
        except Exception as e:
            bot.send_msg(cid, f"❌ Error en análisis: {str(e)}")
        
        return True
    
    return False