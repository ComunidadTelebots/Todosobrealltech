"""Privacy-preserving Telegram language distribution helpers."""

from collections import Counter
import re
import threading

_origin_lock = threading.Lock()
ORIGIN_KEY = 'TELEGRAM_LANGUAGE_ORIGINS'


def record_language_origin(db, message):
    """Count received message observations, without user/chat IDs or content."""
    kind = (message.get('chat') or {}).get('type')
    origin = {'private': 'private', 'group': 'group', 'supergroup': 'group', 'channel': 'channel'}.get(kind)
    if not origin:
        return
    code = normalize_language((message.get('from') or {}).get('language_code'))
    if not re.fullmatch(r'[a-z]{2,3}(?:-[a-z0-9]{2,8})*', code):
        code = 'und'
    with _origin_lock:
        state = db.get(ORIGIN_KEY, {})
        bucket = state.setdefault(origin, {})
        if code not in bucket and len(bucket) >= 256:
            code = 'und'
        bucket[code] = int(bucket.get(code, 0)) + 1
        db.set(ORIGIN_KEY, state)


LANGUAGE_REGIONS = {
    "es": ("Español", "ES", 40.4, -3.7), "en": ("English", "GB", 54.0, -2.0),
    "fa": ("فارسی", "IR", 32.4, 53.7), "ru": ("Русский", "RU", 61.5, 105.3),
    "ar": ("العربية", "SA", 24.7, 46.7), "zh": ("中文", "CN", 35.9, 104.2),
    "tr": ("Türkçe", "TR", 39.0, 35.2), "uk": ("Українська", "UA", 49.0, 31.4),
    "pt": ("Português", "BR", -14.2, -51.9), "de": ("Deutsch", "DE", 51.1, 10.4),
    "fr": ("Français", "FR", 46.2, 2.2), "it": ("Italiano", "IT", 41.9, 12.5),
    "hi": ("हिन्दी", "IN", 22.0, 79.0), "ur": ("اردو", "PK", 30.4, 69.3),
    "id": ("Bahasa Indonesia", "ID", -2.5, 118.0), "vi": ("Tiếng Việt", "VN", 14.1, 108.3),
    "th": ("ไทย", "TH", 15.0, 101.0), "bn": ("বাংলা", "BD", 23.7, 90.4),
    "az": ("Azərbaycanca", "AZ", 40.1, 47.6), "uz": ("Oʻzbekcha", "UZ", 41.4, 63.6),
    "be": ("Беларуская", "BY", 53.7, 27.9), "ka": ("ქართული", "GE", 42.3, 43.4),
    "hy": ("Հայերեն", "AM", 40.1, 45.0), "kk": ("Қазақша", "KZ", 48.0, 66.9),
    "pl": ("Polski", "PL", 51.9, 19.1), "nl": ("Nederlands", "NL", 52.1, 5.3),
    "sv": ("Svenska", "SE", 60.1, 18.6), "fi": ("Suomi", "FI", 64.0, 26.0),
    "ja": ("日本語", "JP", 36.2, 138.3), "ko": ("한국어", "KR", 35.9, 127.8),
    "ro": ("Română", "RO", 45.9, 24.9), "el": ("Ελληνικά", "GR", 39.1, 21.8),
    "he": ("עברית", "IL", 31.5, 34.8), "cs": ("Čeština", "CZ", 49.8, 15.5),
    "hu": ("Magyar", "HU", 47.2, 19.5), "ku": ("Kurdî", "IQ", 33.2, 43.7),
    "ps": ("پښتو", "AF", 33.9, 67.7), "da": ("Dansk", "DK", 56.3, 9.5),
    "no": ("Norsk", "NO", 60.5, 8.5), "ca": ("Català", "ES", 41.6, 1.5),
    "eu": ("Euskara", "ES", 43.0, -2.6), "gl": ("Galego", "ES", 42.8, -8.0),
}

REGION_CENTERS = {
    "US": (39.8, -98.6), "GB": (54.0, -2.0), "MX": (23.6, -102.5),
    "AR": (-38.4, -63.6), "CO": (4.6, -74.1), "CL": (-33.4, -70.7),
    "PE": (-9.2, -75.0), "VE": (6.4, -66.6), "BR": (-14.2, -51.9),
    "PT": (39.6, -8.0), "ES": (40.4, -3.7), "CA": (56.1, -106.3),
    "AU": (-25.3, 133.8), "IN": (22.0, 79.0), "CN": (35.9, 104.2),
}


def normalize_language(code):
    return str(code or "und").strip().lower().replace("_", "-")[:16] or "und"


def aggregate_language_map(user_languages):
    counts = Counter(normalize_language(value) for value in (user_languages or {}).values())
    return aggregate_language_counts(counts)


def aggregate_language_counts(counts):
    counts = Counter(counts)
    total = sum(counts.values())
    points = []
    for code, users in counts.most_common():
        base, _, region = code.partition("-")
        info = LANGUAGE_REGIONS.get(base)
        if region.upper() in REGION_CENTERS:
            lat, lon = REGION_CENTERS[region.upper()]
            label, country = (info[0] if info else base.upper()), region.upper()
        elif info:
            label, country, lat, lon = info
        else:
            label, country, lat, lon = code.upper(), None, 0.0, 0.0
        points.append({"language": code, "label": label, "region_hint": country,
                       "lat": lat, "lon": lon, "users": users,
                       "percentage": round(users * 100 / max(1, total), 2),
                       "mapped": bool(info or region.upper() in REGION_CENTERS)})
    return {"total_users": total, "languages": len(counts), "points": points,
            "basis": "telegram_language_code",
            "accuracy": "language-region estimate; not a physical user location"}
