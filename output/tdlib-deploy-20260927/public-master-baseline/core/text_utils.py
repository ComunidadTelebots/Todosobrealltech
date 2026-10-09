"""Utilidades de texto: reparación de mojibake y normalización a UTF-8.

El proyecto arrastra texto UTF-8 que en algún punto fue decodificado como
Latin-1/CP1252 (mojibake: 🌌 -> 'ðŸŒŒ', ¡ -> 'Â¡'). `force_utf8` repara ese
texto antes de enviarlo a Telegram. Usa ftfy si está disponible (maneja también
texto mixto correcto+mojibake) y, si no, recurre a una heurística cp1252/latin-1.
"""

try:
    from ftfy import fix_text as _ftfy_fix
    _FTFY_AVAILABLE = True
except Exception:
    _ftfy_fix = None
    _FTFY_AVAILABLE = False

# Marcadores típicos de mojibake en este proyecto; si no aparecen, no se repara.
_MOJIBAKE_MARKERS = ("ðŸ", "Ã", "â", "Â", "Å", "Ä", "Ð", "Ñ")


def _fallback_repair(text):
    """Repara mojibake sin ftfy reconstruyendo los bytes originales (cp1252/latin-1)."""
    if not any(m in text for m in _MOJIBAKE_MARKERS):
        return text
    # Reconstrucción byte a byte: caracteres <=0xFF son bytes literales; el resto
    # (p. ej. resultado de un decode cp1252) se re-codifica en cp1252.
    try:
        raw = bytearray()
        for ch in text:
            code = ord(ch)
            if code <= 0xFF:
                raw.append(code)
            else:
                raw.extend(ch.encode("cp1252"))
        fixed = raw.decode("utf-8", errors="strict")
        if fixed and fixed.count("�") <= text.count("�"):
            return fixed
    except Exception:
        pass
    for enc in ("cp1252", "latin-1"):
        try:
            fixed = text.encode(enc, errors="strict").decode("utf-8", errors="strict")
            if fixed and fixed.count("�") <= text.count("�"):
                return fixed
        except Exception:
            continue
    return text


def force_utf8(text):
    """Repara mojibake (ðŸŒŒ->🌌, Â¡->¡) y garantiza UTF-8 válido. Idempotente."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    if _FTFY_AVAILABLE:
        try:
            text = _ftfy_fix(text)
        except Exception:
            text = _fallback_repair(text)
    else:
        text = _fallback_repair(text)
    return text.encode("utf-8", "ignore").decode("utf-8", "ignore")
