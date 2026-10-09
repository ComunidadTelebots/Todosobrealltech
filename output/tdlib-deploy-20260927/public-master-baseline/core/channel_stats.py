"""
channel_stats.py — Directorio de canales, almacenado ÍNTEGRAMENTE en PocketBase.

Fuente única de datos del panel de canales. Detección automática con verificación
de propiedad (getChatAdministrators → creator/administrator). Sin SQLite.

Colecciones PB:
  - tg_channels           registro + métricas actuales (member_count, growth30d, frecuencia)
  - tg_channel_admins     caché de propiedad: (chat_id, user_id, status)
  - tg_channel_snapshots  serie diaria de suscriptores (para gráficas)

La Bot API no expone vistas/post ni engagement → quedan como None hasta TDLib.
"""

import datetime

_pb = None

C_CHANNELS = "tg_channels"
C_ADMINS = "tg_channel_admins"
C_SNAPS = "tg_channel_snapshots"
C_SCHED = "tg_scheduled"
C_ADS = "tg_ads"


def init(pb):
    """Guarda el cliente PB y asegura las colecciones (idempotente)."""
    global _pb
    _pb = pb
    pb.ensure_collection(C_CHANNELS, [
        {"name": "chat_id", "type": "text", "required": True},
        {"name": "username", "type": "text"}, {"name": "title", "type": "text"},
        {"name": "description", "type": "text"}, {"name": "category", "type": "text"},
        {"name": "ctype", "type": "text"}, {"name": "member_count", "type": "number"},
        {"name": "growth30d", "type": "number"}, {"name": "posts_count", "type": "number"},
        {"name": "posts_per_day", "type": "number"}, {"name": "last_post_id", "type": "number"},
        {"name": "first_post_at", "type": "date"}, {"name": "last_post_at", "type": "date"},
        {"name": "bot_token", "type": "text"}, {"name": "added_by", "type": "number"},
        {"name": "active", "type": "bool"}, {"name": "admins_checked", "type": "date"},
        {"name": "listed", "type": "bool"},
    ], ["CREATE UNIQUE INDEX `idx_tgc_chat` ON `tg_channels` (`chat_id`)"])
    # Migración suave: el directorio PÚBLICO es opt-in (listed). Por defecto NADA
    # es público; el dueño decide qué publicar. "Mis canales" ignora este campo.
    pb.ensure_field(C_CHANNELS, {"name": "listed", "type": "bool"})
    pb.ensure_collection(C_ADMINS, [
        {"name": "chat_id", "type": "text", "required": True},
        {"name": "user_id", "type": "number", "required": True},
        {"name": "status", "type": "text"}, {"name": "checked", "type": "date"},
    ], ["CREATE UNIQUE INDEX `idx_tga` ON `tg_channel_admins` (`chat_id`,`user_id`)"])
    pb.ensure_collection(C_SNAPS, [
        {"name": "chat_id", "type": "text", "required": True},
        {"name": "day", "type": "text", "required": True},
        {"name": "member_count", "type": "number"},
    ], ["CREATE UNIQUE INDEX `idx_tgs` ON `tg_channel_snapshots` (`chat_id`,`day`)"])
    pb.ensure_collection(C_SCHED, [
        {"name": "chat_id", "type": "text", "required": True},
        {"name": "text", "type": "text", "required": True},
        {"name": "send_at", "type": "text", "required": True},
        {"name": "sent", "type": "bool"},
        {"name": "created_by", "type": "number"},
        {"name": "bot_token", "type": "text"},
    ])
    pb.ensure_collection(C_ADS, [
        {"name": "from_chat", "type": "text", "required": True},
        {"name": "from_user", "type": "number"}, {"name": "from_name", "type": "text"},
        {"name": "to_chat", "type": "text", "required": True},
        {"name": "to_user", "type": "number"}, {"name": "to_name", "type": "text"},
        {"name": "from_ad", "type": "text"}, {"name": "to_ad", "type": "text"},
        {"name": "when", "type": "text"}, {"name": "status", "type": "text"},
        {"name": "created", "type": "text"},
    ])
    # Migración suave de campos nuevos (las colecciones ya existían).
    pb.ensure_field(C_SCHED, {"name": "photo", "type": "text"})
    pb.ensure_field(C_ADS, {"name": "from_ad_image", "type": "text"})
    pb.ensure_field(C_ADS, {"name": "to_ad_image", "type": "text"})


# ── utilidades ──────────────────────────────────────────────────────────────
def _now():
    return datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.000Z")

def _today():
    return datetime.datetime.utcnow().strftime("%Y-%m-%d")

def _cid(chat_id):
    return _pb.esc(chat_id)


# ── escritura (hooks / colector) ────────────────────────────────────────────
def register_channel(chat_id, username=None, title=None, description=None,
                     ctype=None, bot_token=None, added_by=None):
    data = {"chat_id": str(chat_id), "active": True}
    if username is not None: data["username"] = username
    if title is not None: data["title"] = title
    if description is not None: data["description"] = description
    if ctype is not None: data["ctype"] = ctype
    if bot_token is not None: data["bot_token"] = bot_token
    if added_by is not None: data["added_by"] = added_by
    _pb.upsert(C_CHANNELS, f"chat_id='{_cid(chat_id)}'", data)


def deactivate_channel(chat_id):
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if rec:
        _pb.update(C_CHANNELS, rec["id"], {"active": False})


def set_category(chat_id, category):
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if rec:
        _pb.update(C_CHANNELS, rec["id"], {"category": category})


def update_meta(chat_id, username=None, title=None, description=None):
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if not rec:
        return
    data = {}
    if username: data["username"] = username
    if title: data["title"] = title
    if description: data["description"] = description
    if data:
        _pb.update(C_CHANNELS, rec["id"], data)


def record_snapshot(chat_id, member_count):
    """Guarda el snapshot del día y recalcula el crecimiento a 30d."""
    _pb.upsert(C_SNAPS, f"chat_id='{_cid(chat_id)}' && day='{_today()}'",
               {"chat_id": str(chat_id), "day": _today(), "member_count": member_count})
    snaps = _pb.list(C_SNAPS, filter=f"chat_id='{_cid(chat_id)}'", sort="day", per_page=60)
    growth = 0.0
    if len(snaps) >= 2:
        window = snaps[-30:]
        first = window[0].get("member_count") or 1
        growth = round(((window[-1].get("member_count") or 0) - first) / first * 100, 1) if first else 0.0
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if rec:
        _pb.update(C_CHANNELS, rec["id"], {"member_count": member_count, "growth30d": growth})


def record_post(chat_id, message_id):
    """Cuenta un post publicado (frecuencia). Idempotente por message_id creciente."""
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if not rec:
        return
    if message_id and (rec.get("last_post_id") or 0) >= message_id:
        return
    now = _now()
    first = rec.get("first_post_at") or now
    count = (rec.get("posts_count") or 0) + 1
    try:
        f_dt = datetime.datetime.strptime(first[:19], "%Y-%m-%d %H:%M:%S")
        days = max(1, (datetime.datetime.utcnow() - f_dt).days)
    except Exception:
        days = 1
    _pb.update(C_CHANNELS, rec["id"], {
        "posts_count": count, "last_post_id": message_id or 0,
        "first_post_at": first, "last_post_at": now,
        "posts_per_day": round(count / days, 2),
    })


def set_channel_admins(chat_id, admins):
    """Reemplaza la caché de admins de un canal. admins=[{user_id,status}]."""
    existing = _pb.list(C_ADMINS, filter=f"chat_id='{_cid(chat_id)}'", per_page=200)
    keep = set()
    for a in admins:
        uid = a.get("user_id")
        if uid is None:
            continue
        keep.add(uid)
        _pb.upsert(C_ADMINS, f"chat_id='{_cid(chat_id)}' && user_id={uid}",
                   {"chat_id": str(chat_id), "user_id": uid, "status": a.get("status", "administrator"),
                    "checked": _now()})
    for e in existing:
        if e.get("user_id") not in keep:
            _pb.delete(C_ADMINS, e["id"])
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if rec:
        _pb.update(C_CHANNELS, rec["id"], {"admins_checked": _now()})


# ── lectura para colector / backfill ────────────────────────────────────────
def active_channels(bot_token=None):
    f = "active=true"
    if bot_token:
        f += f" && (bot_token='{_pb.esc(bot_token)}' || bot_token='')"
    return [{"chat_id": r["chat_id"], "bot_token": r.get("bot_token")} for r in _pb.list(C_CHANNELS, filter=f)]


def known_chat_ids():
    return [r["chat_id"] for r in _pb.list(C_CHANNELS, per_page=500)]


def channels_needing_admin_refresh(max_age_seconds=21600, bot_token=None):
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(seconds=max_age_seconds)).strftime("%Y-%m-%d %H:%M:%S.000Z")
    f = f"active=true && (admins_checked='' || admins_checked<'{cutoff}')"
    if bot_token:
        f += f" && (bot_token='{_pb.esc(bot_token)}' || bot_token='')"
    return [{"chat_id": r["chat_id"], "bot_token": r.get("bot_token")} for r in _pb.list(C_CHANNELS, filter=f)]


# ── lectura para la API pública ─────────────────────────────────────────────
def _to_dict(r, role=None):
    return {
        "chat_id": r.get("chat_id"),
        "username": r.get("username") or r.get("chat_id"),
        "name": r.get("title") or r.get("username") or "Canal",
        "description": r.get("description") or "",
        "category": r.get("category") or "sin-categoria",
        "subscribers": r.get("member_count") or 0,
        "growth30d": r.get("growth30d") or 0,
        "postsPerDay": r.get("posts_per_day") or 0,
        "viewsPerPost": None,
        "engagement": None,
        "collecting": not (r.get("growth30d") or r.get("posts_count")),
        "ctype": r.get("ctype") or "channel",
        "listed": bool(r.get("listed")),
        "role": role,
        "owner": role == "creator" if role else None,
    }


def set_listed(chat_id, listed):
    """El dueño publica/oculta un canal en el directorio público."""
    rec = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if rec:
        _pb.update(C_CHANNELS, rec["id"], {"listed": bool(listed)})


def _all_active(listed_only=False):
    f = "active=true && listed=true" if listed_only else "active=true"
    return _pb.list(C_CHANNELS, filter=f, per_page=500)


def get_channels(q="", sort="subscribers", category="all"):
    # PÚBLICO: solo canales opt-in (listed=true).
    items = [_to_dict(r) for r in _all_active(listed_only=True)]
    if category and category != "all":
        items = [x for x in items if x["category"] == category]
    if q:
        n = q.strip().lower()
        items = [x for x in items if n in x["name"].lower() or n in x["username"].lower() or n in x["description"].lower()]
    keyf = {"subscribers": "subscribers", "growth30d": "growth30d", "postsPerDay": "postsPerDay"}.get(sort, "subscribers")
    items.sort(key=lambda x: x.get(keyf) or 0, reverse=True)
    return items


def get_channel(username):
    key = str(username).lstrip("@")
    # PÚBLICO: la ficha solo es visible si el canal está publicado (listed).
    r = _pb.first(C_CHANNELS, f"active=true && listed=true && (username='{_pb.esc(key)}' || chat_id='{_pb.esc(key)}')")
    if not r:
        return None
    d = _to_dict(r)
    snaps = _pb.list(C_SNAPS, filter=f"chat_id='{_cid(r['chat_id'])}'", sort="day", per_page=60)
    d["series"] = [{"date": s["day"], "subs": s.get("member_count") or 0} for s in snaps]
    return d


def get_ranking(category, limit=10):
    items = get_channels(category=category)
    return items[:limit]


def get_all_channels():
    """ADMIN (dueño del bot): todos los canales/grupos donde está el bot."""
    return [_to_dict(r) for r in _all_active(listed_only=False)]


def get_channel_bot_token(chat_id):
    r = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    return r.get("bot_token") if r else None


def get_channel_meta(chat_id):
    r = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if not r:
        return None
    return {"chat_id": r.get("chat_id"), "name": r.get("title") or r.get("username") or "Canal",
            "username": r.get("username"), "ctype": r.get("ctype") or "channel",
            "subscribers": r.get("member_count") or 0, "listed": bool(r.get("listed"))}


# ── Mensajes programados ────────────────────────────────────────────────────
def schedule_message(chat_id, text, send_at, created_by=None, bot_token=None, photo=None):
    return _pb.create(C_SCHED, {"chat_id": str(chat_id), "text": text, "send_at": send_at,
                                "sent": False, "created_by": created_by, "bot_token": bot_token,
                                "photo": photo or ""})


def list_scheduled(chat_id):
    return _pb.list(C_SCHED, filter=f"chat_id='{_cid(chat_id)}' && sent=false", sort="send_at", per_page=100)


def cancel_scheduled(rec_id, chat_id=None):
    rec = _pb.first(C_SCHED, f"id='{_pb.esc(rec_id)}'")
    if rec and (chat_id is None or str(rec.get("chat_id")) == str(chat_id)):
        _pb.delete(C_SCHED, rec["id"])
        return True
    return False


def due_scheduled():
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    return _pb.list(C_SCHED, filter=f"sent=false && send_at<='{now}'", per_page=50)


def mark_sent(rec_id):
    _pb.update(C_SCHED, rec_id, {"sent": True})


def is_user_admin_of(user_id, chat_id):
    """¿El usuario es creator/administrator de ese chat? (desde la caché)."""
    return _pb.first(C_ADMINS, f"chat_id='{_cid(chat_id)}' && user_id={int(user_id)}") is not None


def get_user_channels(user_id):
    """Canales donde el usuario es creator/administrator (desde la caché)."""
    admins = _pb.list(C_ADMINS, filter=f"user_id={int(user_id)}", per_page=200)
    if not admins:
        return []
    role_by_chat = {a["chat_id"]: a.get("status") for a in admins}
    channels = {r["chat_id"]: r for r in _all_active()}
    out = []
    for cid, role in role_by_chat.items():
        r = channels.get(cid)
        if r:
            out.append(_to_dict(r, role=role))
    out.sort(key=lambda x: (x["role"] != "creator", -(x["subscribers"] or 0)))
    return out


def get_stats_by_chat(chat_id):
    """Estadísticas completas de un chat (para el panel de grupo, sin gating)."""
    r = _pb.first(C_CHANNELS, f"chat_id='{_cid(chat_id)}'")
    if not r:
        return None
    d = _to_dict(r)
    snaps = _pb.list(C_SNAPS, filter=f"chat_id='{_cid(chat_id)}'", sort="day", per_page=90)
    series = [{"date": s["day"], "subs": s.get("member_count") or 0} for s in snaps]
    d["series"] = series
    d["posts_count"] = r.get("posts_count") or 0

    def _new(n):
        if len(series) < 2:
            return None
        w = series[-(n + 1):]
        return w[-1]["subs"] - w[0]["subs"] if len(w) >= 2 else None
    d["new7d"] = _new(7)
    d["new30d"] = _new(30)
    return d


def get_channel_owner(chat_id):
    a = _pb.first(C_ADMINS, f"chat_id='{_cid(chat_id)}' && status='creator'")
    return a.get("user_id") if a else None


# ── Anuncios mutuos (estilo InsideAds) ──────────────────────────────────────
def create_ad_request(from_chat, from_user, from_name, to_chat, to_name, from_ad, when, from_image=None):
    return _pb.create(C_ADS, {
        "from_chat": str(from_chat), "from_user": from_user, "from_name": from_name,
        "to_chat": str(to_chat), "to_user": get_channel_owner(to_chat), "to_name": to_name,
        "from_ad": from_ad, "from_ad_image": from_image or "", "when": when,
        "status": "pending", "created": _now(),
    })


def ads_incoming(user_id):
    return _pb.list(C_ADS, filter=f"to_user={int(user_id)} && status='pending'", sort="-created", per_page=50)


def ads_for_channel(chat_id):
    return _pb.list(C_ADS, filter=f"to_chat='{_cid(chat_id)}' && status='pending'", sort="-created", per_page=50)


def ads_outgoing(user_id):
    return _pb.list(C_ADS, filter=f"from_user={int(user_id)}", sort="-created", per_page=50)


def get_ad(ad_id):
    return _pb.first(C_ADS, f"id='{_pb.esc(ad_id)}'")


def set_ad(ad_id, status, to_ad=None, to_image=None):
    data = {"status": status}
    if to_ad is not None:
        data["to_ad"] = to_ad
    if to_image is not None:
        data["to_ad_image"] = to_image
    _pb.update(C_ADS, ad_id, data)


def get_global_stats():
    rows = _all_active(listed_only=True)
    total = sum((r.get("member_count") or 0) for r in rows)
    cats = len({(r.get("category") or "sin-categoria") for r in rows})
    growths = [r.get("growth30d") or 0 for r in rows]
    avg = round(sum(growths) / len(growths), 1) if growths else 0.0
    return {"channels": len(rows), "categories": cats, "totalSubscribers": total, "avgGrowth": avg}
