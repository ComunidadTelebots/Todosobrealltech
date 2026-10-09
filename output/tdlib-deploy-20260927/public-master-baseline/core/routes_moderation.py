import time

from flask import Blueprint, request, jsonify

bp = Blueprint("moderation", __name__)

_check_jwt = None
_db = None
_ban_manager = None
_add_web_log = None
_add_audit_log = None
_global_user_stats = None
_get_bot_for_chat = None


def setup(check_jwt, db, ban_manager, add_web_log, add_audit_log, global_user_stats, get_bot_for_chat):
    global _check_jwt, _db, _ban_manager, _add_web_log, _add_audit_log
    global _global_user_stats, _get_bot_for_chat
    _check_jwt = check_jwt
    _db = db
    _ban_manager = ban_manager
    _add_web_log = add_web_log
    _add_audit_log = add_audit_log
    _global_user_stats = global_user_stats
    _get_bot_for_chat = get_bot_for_chat
    return bp


@bp.route("/api/users/leaderboard")
def web_leaderboard():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    sorted_u = sorted(_global_user_stats.items(), key=lambda x: x[1].get("count", 0), reverse=True)[:20]
    result = []
    for k, v in sorted_u:
        k_score = v.get("karma", 0)
        badge = "🏆 Leyenda" if k_score > 50 else "⭐ Colaborador" if k_score > 20 else "👤 Miembro"
        result.append({"id": k, "name": v.get("name", k), "count": v.get("count", 0), "karma": k_score, "badge": badge})
    return jsonify({"ok": True, "leaderboard": result})


@bp.route("/api/moderation/<cid>")
def web_mod_get(cid):
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    warns = _db.get(f"WARNS_{cid}", {})
    notes = _db.get(f"NOTES_{cid}", "")
    config = _db.get(f"CONFIG_{cid}", {
        "ia_learning": False, "auto_mod": True, "welcome": False, "security_shield": True,
    })
    feeders = _db.get("IA_FEEDERS", [])
    if str(cid) in [str(x) for x in feeders]:
        config["ia_learning"] = True
    return jsonify({
        "ok": True, "warns": warns, "notes": notes, "config": config,
        "local_bans": _ban_manager.get_local_bans(cid).get("users", []),
    })


@bp.route("/api/moderation/settings", methods=["POST"])
def web_mod_settings():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, config = d.get("cid"), d.get("config")
    if not cid or not config:
        return jsonify({"ok": False})
    _db.set(f"CONFIG_{cid}", config)
    feeders = _db.get("IA_FEEDERS", [])
    cid_str = str(cid)
    if config.get("ia_learning"):
        if cid_str not in [str(x) for x in feeders]:
            feeders.append(cid_str)
    else:
        if cid_str in [str(x) for x in feeders]:
            feeders.remove(cid_str)
    _db.set("IA_FEEDERS", feeders)
    _add_web_log("ADMIN", f"Configuración actualizada para grupo {cid}")
    return jsonify({"ok": True})


@bp.route("/api/moderation/notes", methods=["POST"])
def web_mod_notes():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, note = str(d.get("cid", "")), d.get("note", "")
    if not cid:
        return jsonify({"ok": False})
    _db.set(f"NOTES_{cid}", note)
    _add_audit_log(f"Nota guardada para grupo {cid}")
    return jsonify({"ok": True})


@bp.route("/api/moderation/unwarn", methods=["POST"])
def web_mod_unwarn():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, target = str(d.get("cid", "")), d.get("target", "")
    warns = _db.get(f"WARNS_{cid}", {})
    if target in warns:
        del warns[target]
        _db.set(f"WARNS_{cid}", warns)
    return jsonify({"ok": True})


@bp.route("/api/moderation/warn", methods=["POST"])
def web_warn():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, uid = d["cid"], d["uid"]
    warns = _db.get(f"WARNS_{cid}", {})
    warns[uid] = warns.get(uid, 0) + 1
    _db.set(f"WARNS_{cid}", warns)
    bot = _get_bot_for_chat(cid)
    if not bot:
        return jsonify({"ok": False, "msg": "Bot no encontrado para este grupo"}), 404
    bot.send_msg(cid, f"⚠️ Usuario `{uid}` advertido ({warns[uid]}/3)")
    if warns[uid] >= 3:
        _ban_manager.ban_local_user(cid, uid, reason="3 warns", source="warns")
        bot.kick_user(cid, uid)
        _add_web_log("SECURITY", f"Usuario {uid} auto-baneado por acumulación de warns.")
    return jsonify({"ok": True, "count": warns[uid]})


@bp.route("/api/moderation/mute", methods=["POST"])
def web_mute():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, uid = d["cid"], d["uid"]
    bot = _get_bot_for_chat(cid)
    if not bot:
        return jsonify({"ok": False, "msg": "Bot no encontrado para este grupo"}), 404
    bot.restrict_user(cid, uid, until=int(time.time()) + 1800, can_send=False)
    return jsonify({"ok": True})


@bp.route("/api/moderation/karma", methods=["POST"])
def web_karma():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    uid, val = d["uid"], d.get("val", 5)
    if uid in _global_user_stats:
        _global_user_stats[uid]["karma"] += val
        return jsonify({"ok": True, "karma": _global_user_stats[uid]["karma"]})
    return jsonify({"ok": False})


@bp.route("/api/moderation/unmute", methods=["POST"])
def web_mod_unmute():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    cid, target = str(d.get("cid", "")), d.get("target", "")
    muted = _db.get(f"MUTED_{cid}", [])
    if target in muted:
        muted.remove(target)
        _db.set(f"MUTED_{cid}", muted)
    return jsonify({"ok": True})
