"""
image_gen.py — Complemento de generación de imágenes a partir de una descripción.

Genera imágenes texto→imagen. Backend por defecto: Pollinations (gratis, sin API
key, devuelve la imagen por URL — sirve tanto para previsualizar en la Mini App
como para `sendPhoto` de Telegram, que acepta una URL).

Para usar OpenAI/Gemini en su lugar (mayor calidad, requiere clave), basta con
implementar `generate_url` con ese proveedor: el resto del sistema no cambia.
"""

import urllib.parse
import urllib.request

POLLINATIONS = "https://image.pollinations.ai/prompt/"
# Pollinations exige User-Agent (si no, 403). El navegador ya lo manda al
# previsualizar; para descargar en servidor usamos estas cabeceras.
_HEADERS = {"User-Agent": "Mozilla/5.0 (MoonMultibot)", "Referer": "https://cintiabot.todosobreall.tech/"}


def generate_url(prompt, width=1024, height=1024, seed=None, model=None):
    """Devuelve una URL directa a la imagen generada para `prompt`."""
    p = urllib.parse.quote((prompt or "").strip()[:500])
    q = {"width": width, "height": height, "nologo": "true"}
    if model:
        q["model"] = model
    if seed is not None:
        q["seed"] = seed
    return f"{POLLINATIONS}{p}?{urllib.parse.urlencode(q)}"


def generate_variants(prompt, n=4, width=1024, height=1024):
    """Varias variantes (distintas semillas) para poder ELEGIR entre ellas."""
    return [generate_url(prompt, width=width, height=height, seed=i * 7 + 1) for i in range(n)]


def fetch_bytes(url, timeout=45):
    """Descarga la imagen (con cabeceras válidas). Devuelve bytes o None."""
    try:
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            if r.status == 200:
                return r.read()
    except Exception:
        return None
    return None
