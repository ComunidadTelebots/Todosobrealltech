import time

from flask import Blueprint, jsonify, request

bp = Blueprint("users_routes", __name__)

_check_jwt = None
_db = None
_ban_manager = None
_add_audit_log = None
_add_web_log = None
_get_bot_for_chat = None
_iter_known_group_targets = None
_get_global_media_list = None
_get_global_user_stats = None


def setup(
    check_jwt,
    db,
    ban_manager,
    add_audit_log,
    add_web_log,
    get_bot_for_chat,
    iter_known_group_targets,
    get_global_media_list,
    get_global_user_stats,
):
    global _check_jwt, _db, _ban_manager, _add_audit_log, _add_web_log
    global _get_bot_for_chat, _iter_known_group_targets, _get_global_media_list, _get_global_user_stats
    _check_jwt = check_jwt
    _db = db
    _ban_manager = ban_manager
    _add_audit_log = add_audit_log
    _add_web_log = add_web_log
    _get_bot_for_chat = get_bot_for_chat
    _iter_known_group_targets = iter_known_group_targets
    _get_global_media_list = get_global_media_list
    _get_global_user_stats = get_global_user_stats
    return bp


@bp.route("/api/media")
def web_media():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "media": _get_global_media_list()[-50:]})


@bp.route("/api/stats/users")
def web_user_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    global_user_stats = _get_global_user_stats()
    sorted_u = sorted(global_user_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    return jsonify({"ok": True, "users": [{"id": k, "name": v["name"], "count": v["count"]} for k, v in sorted_u]})


@bp.route("/api/users/ban", methods=["POST"])
def web_user_ban():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    data = request.json or {}
    u = str(data.get("uid", "")).strip()
    cid = data.get("cid")
    reason = data.get("reason", "Manual ban from web")
    scope = data.get("scope") or ("local" if cid else "global")
    if not u:
        return jsonify({"ok": False, "msg": "UID requerido"}), 400
    if scope == "local":
        if not cid:
            return jsonify({"ok": False, "msg": "CID requerido para ban local"}), 400
        _ban_manager.ban_local_user(cid, u, reason=reason, source="web_manual")
        audit_msg = f"Usuario {u} baneado localmente en {cid}. Razon: {reason}"
    else:
        _ban_manager.ban_user(u, reason=reason, source="web_manual")
        audit_msg = f"Usuario {u} baneado globalmente. Razon: {reason}"
    _add_audit_log(audit_msg)
    bot = _get_bot_for_chat(cid) if cid else None
    telegram_result = None
    telegram_results = []
    if cid and bot:
        telegram_result = bot.kick_user(cid, u)
        telegram_results.append({"cid": str(cid), "ok": telegram_result.get("ok"), "description": telegram_result.get("description")})
        if telegram_result.get("ok"):
            _add_web_log("SECURITY", f"Usuario {u} expulsado de {cid} ({scope}).")
        else:
            _add_web_log("ERROR", f"No se pudo expulsar a {u} de {cid}: {telegram_result.get('description')}")
    elif scope == "global":
        for target_bot, target_cid in _iter_known_group_targets():
            res = target_bot.kick_user(target_cid, u)
            telegram_results.append({"cid": target_cid, "ok": res.get("ok"), "description": res.get("description")})
        if telegram_results:
            ok_count = len([r for r in telegram_results if r.get("ok")])
            _add_web_log("SECURITY", f"Ban global de {u} propagado a {ok_count}/{len(telegram_results)} grupos conocidos.")
    return jsonify({"ok": True, "scope": scope, "telegram": telegram_result, "telegram_results": telegram_results, "message": audit_msg})


@bp.route("/api/ping")
def web_ping():
    return jsonify({"ok": True, "status": "online", "time": time.time()})


@bp.route("/api/users/bans", methods=["GET"])
def web_get_bans():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    cid = request.args.get("cid")
    bans_data = _ban_manager.get_local_bans(cid) if cid else _ban_manager.get_all_bans()
    return jsonify({"ok": True, "scope": "local" if cid else "global", "cid": cid, "total": len(bans_data.get("users", [])), "bans": bans_data.get("users", [])})


@bp.route("/api/users/bans/stats", methods=["GET"])
def web_get_ban_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, **_ban_manager.get_ban_stats()})


@bp.route("/api/users/bans/history", methods=["GET"])
def web_get_ban_history():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    limit = request.args.get("limit", 50, type=int)
    history = _ban_manager.get_ban_history(limit)
    return jsonify({"ok": True, "history": history})


@bp.route("/api/users/unban", methods=["POST"])
def web_user_unban():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    data = request.json or {}
    u = str(data.get("uid", "")).strip()
    cid = data.get("cid")
    scope = data.get("scope") or ("local" if cid else "global")
    if not u:
        return jsonify({"ok": False, "message": "UID requerido"}), 400
    result = _ban_manager.unban_local_user(cid, u) if scope == "local" and cid else _ban_manager.unban_user(u)
    telegram_result = None
    telegram_results = []
    if cid:
        bot = _get_bot_for_chat(cid)
        if bot:
            telegram_result = bot.api_call("unbanChatMember", {"chat_id": cid, "user_id": u})
            telegram_results.append({"cid": str(cid), "ok": telegram_result.get("ok"), "description": telegram_result.get("description")})
    elif scope == "global":
        for target_bot, target_cid in _iter_known_group_targets():
            res = target_bot.api_call("unbanChatMember", {"chat_id": target_cid, "user_id": u})
            telegram_results.append({"cid": target_cid, "ok": res.get("ok"), "description": res.get("description")})
    if result:
        _add_audit_log(f"Usuario {u} desbaneado desde web ({scope})")
        _add_web_log("SECURITY", f"Usuario {u} desbaneado ({scope})")
        return jsonify({"ok": True, "scope": scope, "telegram": telegram_result, "telegram_results": telegram_results, "message": "Usuario desbaneado"})
    return jsonify({"ok": False, "message": "Usuario no estaba baneado"})


@bp.route("/api/users/notes", methods=["POST"])
def web_user_notes():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json
    uid, note = str(d.get("uid")), d.get("note", "")
    global_user_stats = _get_global_user_stats()
    if uid in global_user_stats:
        global_user_stats[uid]["notes"] = note
    return jsonify({"ok": True})


@bp.route("/api/stats/heatmap")
def web_heatmap():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    history = _db.get("GLOBAL_HISTORY", [])
    counts = [0] * 24
    for m in history:
        try:
            hour = int(m.get("time", "00:00").split(":")[0])
            if 0 <= hour < 24:
                counts[hour] += 1
        except Exception:
            pass
    return jsonify({"ok": True, "heatmap": counts})
