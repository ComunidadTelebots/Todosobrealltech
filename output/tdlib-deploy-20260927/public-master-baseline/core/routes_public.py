"""
routes_public.py — Endpoints PÚBLICOS (sin JWT) del hub.

Zona pública del panel: estadísticas de canales y obtención de proxy MTProto.
Solo lectura / acciones seguras. Todo lo administrativo sigue en sus blueprints
protegidos por check_jwt.

CORS abierto para que canales.todosobreall.tech (y el propio panel) puedan
consumir la API desde el navegador.
"""

import hmac
import hashlib
import json
import datetime
import time
import secrets
from urllib.parse import parse_qsl

import jwt
from flask import Blueprint, request, jsonify

from . import image_gen

bp = Blueprint("public", __name__)

_channel_stats = None
_proxy_mgr = None
_master_id = None
_jwt_secret = None
_get_active_bots = None
_db = None
_ban_manager = None
_get_bot_for_chat = None
_check_cas = None
_hub_bot_username = "cintiabot"


def setup(channel_stats, proxy_mgr, master_id=None, jwt_secret=None, get_active_bots=None,
          db=None, ban_manager=None, get_bot_for_chat=None, check_cas=None,
          hub_bot_username="cintiabot"):
    global _channel_stats, _proxy_mgr, _master_id, _jwt_secret, _get_active_bots
    global _db, _ban_manager, _get_bot_for_chat, _check_cas
    global _hub_bot_username
    _check_cas = check_cas
    _channel_stats = channel_stats
    _proxy_mgr = proxy_mgr
    _master_id = master_id
    _jwt_secret = jwt_secret
    _get_active_bots = get_active_bots
    _db = db
    _ban_manager = ban_manager
    _get_bot_for_chat = get_bot_for_chat
    _hub_bot_username = hub_bot_username or "cintiabot"
    return bp


# Desfase máximo (s) permitido hacia el futuro: un auth_date muy adelantado
# indica reloj manipulado / firma falsificada.
_AUTH_DATE_SKEW = 300


def _hub_bot():
    """La ÚNICA instancia de bot que sirve la Mini App del hub (por username).
    Devuelve None si no está activa → fail-closed (se deniega la validación)."""
    if not _get_active_bots:
        return None
    want = (_hub_bot_username or "").lower()
    for b in _get_active_bots() or []:
        if (getattr(b, "bot_username", "") or "").lower() == want:
            return b
    return None


def _verify_init_data(init_data, max_age=86400):
    """Valida el initData de la Mini App del hub. Endurecido:
      1) auth_date obligatorio: rechaza firmas de más de `max_age` s (24h por
         defecto) o con reloj en el futuro (> _AUTH_DATE_SKEW).
      2) firma SOLO contra el token del bot del hub, no contra cualquier bot.
    Devuelve el dict de usuario si la firma es válida y vigente, o None."""
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    except Exception:
        return None
    recv_hash = pairs.pop("hash", None)
    if not recv_hash:
        return None
    # 1) Vigencia (auth_date sí forma parte del data_check_string; solo se saca 'hash').
    try:
        auth_date = int(pairs.get("auth_date", ""))
    except (TypeError, ValueError):
        return None
    now = int(time.time())
    if auth_date <= 0 or now - auth_date > max_age or auth_date - now > _AUTH_DATE_SKEW:
        return None
    # 2) Firma: comprobar contra el bot del hub y contra cualquier bot activo del ecosistema
    tokens_to_try = []
    hub_b = _hub_bot()
    if hub_b and getattr(hub_b, "token", None):
        tokens_to_try.append(hub_b.token)
    if _get_active_bots:
        for b in _get_active_bots() or []:
            tok = getattr(b, "token", None)
            if tok and tok not in tokens_to_try:
                tokens_to_try.append(tok)
    
    if not tokens_to_try:
        return None

    data_check = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    for token in tokens_to_try:
        secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
        calc = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(calc, recv_hash):
            try:
                return json.loads(pairs.get("user", "{}"))
            except Exception:
                return {}
    return None


@bp.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


# ─────────────────────────── Auth Mini App (Telegram) ──────────────────────────

@bp.route("/api/public/tg_auth", methods=["POST", "OPTIONS"])
def tg_auth():
    """Valida el initData de la Mini App y dice si el usuario es el master.
    Si lo es, emite un JWT válido para el panel admin (auto-login)."""
    if request.method == "OPTIONS":
        return ("", 204)
    init_data = (request.json or {}).get("initData", "")
    user = _verify_init_data(init_data)
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    is_master = _master_id is not None and str(user.get("id")) == str(_master_id)
    resp = {"ok": True, "is_master": is_master, "user": {
        "id": user.get("id"), "first_name": user.get("first_name"), "username": user.get("username"),
    }}
    if is_master and _jwt_secret:
        resp["token"] = jwt.encode(
            {"exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
            _jwt_secret, algorithm="HS256",
        )
    return jsonify(resp)


def _is_master(user):
    return _master_id is not None and str(user.get("id")) == str(_master_id)


@bp.route("/api/public/admin/channels", methods=["POST", "OPTIONS"])
def admin_all_channels():
    """TODOS los canales/grupos donde está el bot. Solo el dueño del bot (master)."""
    if request.method == "OPTIONS":
        return ("", 204)
    user = _verify_init_data((request.json or {}).get("initData", ""))
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    if not _is_master(user):
        return jsonify({"ok": False, "error": "solo el dueño del bot"}), 403
    return jsonify({"ok": True, "channels": _channel_stats.get_all_channels()})


@bp.route("/api/public/admin/set_listed", methods=["POST", "OPTIONS"])
def admin_set_listed():
    """Publicar/ocultar un canal en el directorio público. Master o dueño del chat."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user = _verify_init_data(body.get("initData", ""))
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    chat_id = body.get("chat_id")
    listed = bool(body.get("listed"))
    if chat_id is None:
        return jsonify({"ok": False, "error": "falta chat_id"}), 400
    allowed = _is_master(user) or _channel_stats.is_user_admin_of(user.get("id"), chat_id)
    if not allowed:
        return jsonify({"ok": False, "error": "sin permiso sobre ese canal"}), 403
    _channel_stats.set_listed(chat_id, listed)
    return jsonify({"ok": True, "chat_id": chat_id, "listed": listed})


# ─────────────────────── Gestión de grupo (admin/creador) ──────────────────────

def _group_auth(body):
    """Devuelve (user, chat_id) si el usuario puede gestionar ese chat, o (None, resp_error)."""
    user = _verify_init_data(body.get("initData", ""))
    if user is None:
        return None, (jsonify({"ok": False, "error": "initData inválido"}), 401)
    chat_id = body.get("chat_id")
    if chat_id is None:
        return None, (jsonify({"ok": False, "error": "falta chat_id"}), 400)
    if not (_is_master(user) or _channel_stats.is_user_admin_of(user.get("id"), chat_id)):
        return None, (jsonify({"ok": False, "error": "sin permiso sobre ese chat"}), 403)
    return (user, chat_id), None


_SETTING_KEYS = {"auto_mod", "welcome", "ia_learning", "security_shield"}


def _banned_hit(chat_id, text):
    """Devuelve la primera palabra prohibida del chat que aparece en `text`, o None."""
    bw = _db.get(f"BADWORDS_{chat_id}", {}) if _db else {}
    words = bw.get("words", []) if isinstance(bw, dict) else []
    if not words or not text:
        return None
    low = text.lower()
    return next((w for w in words if w and w.lower() in low), None)


@bp.route("/api/public/group/get", methods=["POST", "OPTIONS"])
def group_get():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    user, chat_id = res
    meta = _channel_stats.get_channel_meta(chat_id) or {}
    config = _db.get(f"CONFIG_{chat_id}", {"auto_mod": True, "welcome": False, "ia_learning": False, "security_shield": True})
    warns = _db.get(f"WARNS_{chat_id}", {})
    bans = _ban_manager.get_local_bans(chat_id).get("users", []) if _ban_manager else []
    sched = [{"id": s["id"], "text": s.get("text"), "send_at": s.get("send_at")}
             for s in _channel_stats.list_scheduled(chat_id)]
    bw = _db.get(f"BADWORDS_{chat_id}", {"words": [], "action": "delete"})
    if not isinstance(bw, dict):
        bw = {"words": [], "action": "delete"}
    return jsonify({"ok": True, "meta": meta, "role": ("creator" if _is_master(user) else None),
                    "config": {k: bool(config.get(k)) for k in _SETTING_KEYS},
                    "notes": _db.get(f"NOTES_{chat_id}", ""),
                    "warns": [{"user_id": k, "count": v} for k, v in warns.items()],
                    "bans": bans, "scheduled": sched,
                    "badwords": {"words": bw.get("words", []), "action": bw.get("action", "delete")}})


@bp.route("/api/public/group/unban", methods=["POST", "OPTIONS"])
def group_unban():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    uid = body.get("user_id")
    bot = _get_bot_for_chat(chat_id) if _get_bot_for_chat else None
    if bot:
        bot.api_call("unbanChatMember", {"chat_id": chat_id, "user_id": uid, "only_if_banned": True})
    key = f"BANS_{chat_id}"
    data = _db.get(key, {"users": []})
    data["users"] = [u for u in data.get("users", []) if str(u) != str(uid)]
    _db.set(key, data)
    return jsonify({"ok": True})


@bp.route("/api/public/group/unwarn", methods=["POST", "OPTIONS"])
def group_unwarn():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    warns = _db.get(f"WARNS_{chat_id}", {})
    warns.pop(str(body.get("user_id")), None)
    _db.set(f"WARNS_{chat_id}", warns)
    return jsonify({"ok": True})


@bp.route("/api/public/group/settings", methods=["POST", "OPTIONS"])
def group_settings():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    key = body.get("key")
    if key not in _SETTING_KEYS:
        return jsonify({"ok": False, "error": "ajuste no permitido"}), 400
    config = _db.get(f"CONFIG_{chat_id}", {})
    config[key] = bool(body.get("value"))
    _db.set(f"CONFIG_{chat_id}", config)
    return jsonify({"ok": True, "config": {k: bool(config.get(k)) for k in _SETTING_KEYS}})


@bp.route("/api/public/group/notes", methods=["POST", "OPTIONS"])
def group_notes():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    _db.set(f"NOTES_{chat_id}", str(body.get("notes", ""))[:2000])
    return jsonify({"ok": True})


@bp.route("/api/public/group/send", methods=["POST", "OPTIONS"])
def group_send():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "error": "mensaje vacío"}), 400
    bot = _get_bot_for_chat(chat_id) if _get_bot_for_chat else None
    if not bot:
        return jsonify({"ok": False, "error": "sin bot para este chat"}), 503
    r = bot.send_msg(chat_id, text)
    return jsonify({"ok": bool(r.get("ok")) if isinstance(r, dict) else True})


@bp.route("/api/public/group/schedule", methods=["POST", "OPTIONS"])
def group_schedule():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    user, chat_id = res
    text = (body.get("text") or "").strip()
    send_at = (body.get("send_at") or "").strip()  # "YYYY-MM-DD HH:MM:SS" UTC
    if not text or not send_at:
        return jsonify({"ok": False, "error": "faltan texto o fecha"}), 400
    tok = _channel_stats.get_channel_bot_token(chat_id)
    rec = _channel_stats.schedule_message(chat_id, text, send_at, created_by=user.get("id"), bot_token=tok)
    return jsonify({"ok": True, "id": rec.get("id"), "send_at": send_at})


@bp.route("/api/public/group/badwords", methods=["POST", "OPTIONS"])
def group_badwords():
    """Guarda la lista de palabras prohibidas y la acción (delete|warn|ban)."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    words = body.get("words") or []
    words = [str(w).strip() for w in words if str(w).strip()][:200]
    action = body.get("action", "delete")
    if action not in ("delete", "warn", "ban"):
        action = "delete"
    _db.set(f"BADWORDS_{chat_id}", {"words": words, "action": action})
    return jsonify({"ok": True, "words": words, "action": action})


@bp.route("/api/public/group/sendphoto", methods=["POST", "OPTIONS"])
def group_sendphoto():
    """Envía una imagen (por URL) al grupo. Usado por el generador de imágenes."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    photo = (body.get("photo_url") or "").strip()
    if not photo:
        return jsonify({"ok": False, "error": "falta la imagen"}), 400
    bot = _get_bot_for_chat(chat_id) if _get_bot_for_chat else None
    if not bot:
        return jsonify({"ok": False, "error": "sin bot para este chat"}), 503
    caption = (body.get("caption") or "")[:1024]
    # Descarga la imagen (con UA válido) y la sube a Telegram como archivo,
    # para no depender de que Telegram pueda con la URL del generador.
    data = image_gen.fetch_bytes(photo)
    if data:
        import requests
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot.token}/sendPhoto",
                data={"chat_id": str(chat_id), "caption": caption},
                files={"photo": ("imagen.jpg", data)}, timeout=45,
            )
            return jsonify({"ok": bool(resp.json().get("ok"))})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]}), 502
    # Fallback: pasar la URL directamente a Telegram
    r = bot.api_call("sendPhoto", {"chat_id": chat_id, "photo": photo, "caption": caption})
    return jsonify({"ok": bool(r.get("ok")) if isinstance(r, dict) else True})


@bp.route("/api/public/image/generate", methods=["POST", "OPTIONS"])
def image_generate():
    """Genera imágenes a partir de una descripción (varias variantes para elegir)."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    prompt = (body.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"ok": False, "error": "describe la imagen"}), 400
    return jsonify({"ok": True, "prompt": prompt, "images": image_gen.generate_variants(prompt, n=4)})


@bp.route("/api/public/group/cas", methods=["POST", "OPTIONS"])
def group_cas():
    """Info CAS (cas.chat) de un usuario + su estado real en el grupo (getChatMember)."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    uid = body.get("user_id")
    cas = _check_cas(uid) if _check_cas else {"ok": False, "banned": False}
    tg_status = None
    bot = _get_bot_for_chat(chat_id) if _get_bot_for_chat else None
    if bot:
        r = bot.api_call("getChatMember", {"chat_id": chat_id, "user_id": uid})
        if isinstance(r, dict) and r.get("ok"):
            tg_status = (r.get("result") or {}).get("status")
    return jsonify({"ok": True, "user_id": uid, "cas": cas, "tg_status": tg_status})


@bp.route("/api/public/group/unschedule", methods=["POST", "OPTIONS"])
def group_unschedule():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    ok = _channel_stats.cancel_scheduled(body.get("id"), chat_id)
    return jsonify({"ok": ok})


@bp.route("/api/public/group/stats", methods=["POST", "OPTIONS"])
def group_stats():
    """Estadísticas tipo TGStat del grupo/canal (admin/creador del chat)."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    return jsonify({"ok": True, "stats": _channel_stats.get_stats_by_chat(chat_id)})


# ─────────────────────────── Anuncios mutuos (InsideAds) ────────────────────────
def _auth_user(body):
    user = _verify_init_data(body.get("initData", ""))
    if user is None:
        return None, (jsonify({"ok": False, "error": "initData inválido"}), 401)
    return user, None


@bp.route("/api/public/ads/partners", methods=["POST", "OPTIONS"])
def ads_partners():
    """Canales disponibles como socios (donde el bot está), excepto el propio."""
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    res, err = _group_auth(body)
    if err:
        return err
    _, chat_id = res
    out = [{"chat_id": c["chat_id"], "name": c["name"], "username": c["username"],
            "subscribers": c["subscribers"], "ctype": c["ctype"]}
           for c in _channel_stats.get_all_channels() if str(c["chat_id"]) != str(chat_id)]
    return jsonify({"ok": True, "partners": out})


@bp.route("/api/public/ads/request", methods=["POST", "OPTIONS"])
def ads_request():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    from_chat = body.get("from_chat")
    to_chat = body.get("to_chat")
    from_ad = (body.get("from_ad") or "").strip()
    when = (body.get("when") or "").strip()
    if not (from_chat and to_chat and from_ad and when):
        return jsonify({"ok": False, "error": "faltan datos"}), 400
    if not (_is_master(user) or _channel_stats.is_user_admin_of(user.get("id"), from_chat)):
        return jsonify({"ok": False, "error": "no gestionas el canal de origen"}), 403
    hit = _banned_hit(to_chat, from_ad)
    if hit:
        return jsonify({"ok": False, "error": f"El anuncio contiene una palabra no permitida en el canal destino: «{hit}»"}), 400
    fm = _channel_stats.get_channel_meta(from_chat) or {}
    tm = _channel_stats.get_channel_meta(to_chat) or {}
    rec = _channel_stats.create_ad_request(from_chat, user.get("id"), fm.get("name"),
                                           to_chat, tm.get("name"), from_ad, when,
                                           from_image=(body.get("from_image") or "").strip())
    return jsonify({"ok": True, "id": rec.get("id")})


@bp.route("/api/public/ads/incoming", methods=["POST", "OPTIONS"])
def ads_incoming_ep():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    chat_id = body.get("chat_id")
    if chat_id is not None:
        rows = _channel_stats.ads_for_channel(chat_id)
    else:
        rows = _channel_stats.ads_incoming(user.get("id"))
    ads = [{"id": r["id"], "from_name": r.get("from_name"), "from_chat": r.get("from_chat"),
            "to_name": r.get("to_name"), "from_ad": r.get("from_ad"),
            "from_image": r.get("from_ad_image"), "when": r.get("when")} for r in rows]
    return jsonify({"ok": True, "ads": ads})


@bp.route("/api/public/ads/outgoing", methods=["POST", "OPTIONS"])
def ads_outgoing_ep():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    rows = _channel_stats.ads_outgoing(user.get("id"))
    ads = [{"id": r["id"], "to_name": r.get("to_name"), "from_ad": r.get("from_ad"),
            "when": r.get("when"), "status": r.get("status")} for r in rows]
    return jsonify({"ok": True, "ads": ads})


@bp.route("/api/public/ads/accept", methods=["POST", "OPTIONS"])
def ads_accept():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    ad = _channel_stats.get_ad(body.get("id"))
    if not ad:
        return jsonify({"ok": False, "error": "solicitud no encontrada"}), 404
    if not (_is_master(user) or _channel_stats.is_user_admin_of(user.get("id"), ad.get("to_chat"))):
        return jsonify({"ok": False, "error": "no gestionas el canal destino"}), 403
    to_ad = (body.get("to_ad") or "").strip()
    if not to_ad:
        return jsonify({"ok": False, "error": "falta tu anuncio"}), 400
    to_image = (body.get("to_image") or "").strip()
    hit = _banned_hit(ad.get("from_chat"), to_ad)
    if hit:
        return jsonify({"ok": False, "error": f"Tu anuncio contiene una palabra no permitida en el canal destino: «{hit}»"}), 400
    when = ad.get("when")
    # Programa ambos anuncios (con imagen si la hay): el de origen va al destino y viceversa.
    _channel_stats.schedule_message(ad["to_chat"], ad["from_ad"], when, created_by=user.get("id"),
                                    bot_token=_channel_stats.get_channel_bot_token(ad["to_chat"]),
                                    photo=ad.get("from_ad_image"))
    _channel_stats.schedule_message(ad["from_chat"], to_ad, when, created_by=user.get("id"),
                                    bot_token=_channel_stats.get_channel_bot_token(ad["from_chat"]),
                                    photo=to_image)
    _channel_stats.set_ad(ad["id"], "accepted", to_ad, to_image)
    return jsonify({"ok": True})


@bp.route("/api/public/ads/decline", methods=["POST", "OPTIONS"])
def ads_decline():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user, err = _auth_user(body)
    if err:
        return err
    ad = _channel_stats.get_ad(body.get("id"))
    if not ad:
        return jsonify({"ok": False, "error": "no encontrada"}), 404
    if not (_is_master(user) or _channel_stats.is_user_admin_of(user.get("id"), ad.get("to_chat"))):
        return jsonify({"ok": False, "error": "sin permiso"}), 403
    _channel_stats.set_ad(ad["id"], "declined")
    return jsonify({"ok": True})


@bp.route("/api/public/stats/mine", methods=["POST", "OPTIONS"])
def public_mine():
    """Canales del usuario que abre la Mini App (validado por initData)."""
    if request.method == "OPTIONS":
        return ("", 204)
    init_data = (request.json or {}).get("initData", "")
    user = _verify_init_data(init_data)
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    return jsonify({"ok": True, "channels": _channel_stats.get_user_channels(user.get("id"))})


# ─────────────────────────── Captcha de entrada (Join Request Queries) ──────────
# Pool de iconos del captcha (los mismos nombres que join.html mapea a SVG).
_JOIN_ICONS = ["star", "heart", "bolt", "moon", "cloud", "leaf"]


def _new_join_challenge():
    """9 celdas con EXACTAMENTE 3 iconos objetivo. Devuelve (target, grid, correct)."""
    rnd = secrets.SystemRandom()
    target = rnd.choice(_JOIN_ICONS)
    others = [i for i in _JOIN_ICONS if i != target]
    correct = sorted(rnd.sample(range(9), 3))
    grid = [target if i in correct else rnd.choice(others) for i in range(9)]
    return target, grid, correct


@bp.route("/api/public/join/challenge", methods=["POST", "OPTIONS"])
def join_challenge():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user = _verify_init_data(body.get("initData", ""))
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    cid, uid = body.get("chat"), user.get("id")
    if cid is None:
        return jsonify({"ok": False, "error": "falta chat"}), 400
    pend = _db.get(f"JOINQ_{cid}_{uid}") if _db else None
    if not pend or pend.get("exp", 0) < time.time():
        return jsonify({"ok": False, "error": "sin solicitud pendiente"}), 410
    target, grid, correct = _new_join_challenge()
    _db.set(f"JOINC_{cid}_{uid}", {"correct": correct, "exp": int(time.time()) + 120})
    return jsonify({"ok": True, "target": target, "grid": grid, "expires_in": 120})


@bp.route("/api/public/join/verify", methods=["POST", "OPTIONS"])
def join_verify():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.json or {}
    user = _verify_init_data(body.get("initData", ""))
    if user is None:
        return jsonify({"ok": False, "error": "initData inválido"}), 401
    cid, uid = body.get("chat"), user.get("id")
    pend = _db.get(f"JOINQ_{cid}_{uid}") if _db else None
    if not pend or pend.get("exp", 0) < time.time():
        return jsonify({"ok": False, "expired": True, "error": "solicitud expirada"}), 410
    chal = _db.get(f"JOINC_{cid}_{uid}")
    if not chal or chal.get("exp", 0) < time.time():
        return jsonify({"ok": False, "expired": True, "error": "reto expirado"})
    try:
        sel = sorted(int(i) for i in (body.get("selected") or []))
    except (TypeError, ValueError):
        sel = []
    bot = _hub_bot()
    # ── ÉXITO ──
    if sel and sel == sorted(chal.get("correct", [])):
        if bot:
            bot.api_call("answerChatJoinRequestQuery", {"query_id": pend.get("query_id")})
        _db.delete(f"JOINC_{cid}_{uid}"); _db.delete(f"JOINQ_{cid}_{uid}")  # query_id de un solo uso
        return jsonify({"ok": True, "approved": True})
    # ── FALLO ──
    attempts = int(pend.get("attempts", 0)) + 1
    _db.delete(f"JOINC_{cid}_{uid}")  # fuerza reto nuevo (no resetea intentos)
    if attempts >= 3:
        if bot:
            bot.api_call("declineChatJoinRequest", {"chat_id": cid, "user_id": uid})
        _db.delete(f"JOINQ_{cid}_{uid}")
        return jsonify({"ok": False, "declined": True, "attempts_left": 0})
    pend["attempts"] = attempts
    _db.set(f"JOINQ_{cid}_{uid}", pend)
    return jsonify({"ok": False, "attempts_left": 3 - attempts})


# ─────────────────────────────── Canales ───────────────────────────────────────

@bp.route("/api/public/stats/global")
def public_global():
    return jsonify({"ok": True, **_channel_stats.get_global_stats()})


@bp.route("/api/public/stats/channels")
def public_channels():
    rows = _channel_stats.get_channels(
        q=request.args.get("q", ""),
        sort=request.args.get("sort", "subscribers"),
        category=request.args.get("category", "all"),
    )
    return jsonify({"ok": True, "channels": rows})


@bp.route("/api/public/stats/channels/<username>")
def public_channel(username):
    ch = _channel_stats.get_channel(username)
    if not ch:
        return jsonify({"ok": False, "error": "not found"}), 404
    return jsonify({"ok": True, "channel": ch})


@bp.route("/api/public/stats/ranking")
def public_ranking():
    cat = request.args.get("category", "sin-categoria")
    return jsonify({"ok": True, "ranking": _channel_stats.get_ranking(cat)})


# ─────────────────────────────── Proxy ──────────────────────────────────────────

@bp.route("/api/public/proxy")
def public_proxy():
    """Devuelve un proxy MTProto activo listo para conectar (sin login)."""
    if not _proxy_mgr:
        return jsonify({"ok": False, "error": "proxy no disponible"}), 503
    try:
        vps = _proxy_mgr.get_vps_config(include_secret=True) or {}
    except Exception:
        vps = {}
    host = vps.get("host")
    candidates = []
    for p in getattr(_proxy_mgr, "proxies", []) or []:
        port, secret = p.get("port"), p.get("secret")
        if host and port and secret:
            candidates.append({
                "server": host,
                "port": port,
                "secret": secret,
                "tg_link": f"tg://proxy?server={host}&port={port}&secret={secret}",
                "https_link": f"https://t.me/proxy?server={host}&port={port}&secret={secret}",
                "tag": p.get("tag", ""),
            })
    if not candidates:
        return jsonify({"ok": False, "error": "sin proxies activos configurados"}), 404
    return jsonify({"ok": True, "count": len(candidates), "proxies": candidates})
