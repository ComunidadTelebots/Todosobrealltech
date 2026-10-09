import json
import time

from flask import Blueprint, jsonify, request

bp = Blueprint("admin", __name__)

_check_jwt = None
_db = None
_add_audit_log = None
_get_global_chat_names = None
_get_proxy_bot = None
_get_global_user_stats = None
_get_global_msg_log = None
_get_ia_nativa = None
_get_maintenance_mode = None
_set_maintenance_mode = None
_ban_manager = None


def setup(
    check_jwt,
    db,
    add_audit_log,
    get_global_chat_names,
    get_proxy_bot,
    get_global_user_stats,
    get_global_msg_log,
    get_ia_nativa,
    get_maintenance_mode,
    set_maintenance_mode,
    ban_manager=None,
):
    global _check_jwt, _db, _add_audit_log, _get_global_chat_names, _get_proxy_bot
    global _get_global_user_stats, _get_global_msg_log, _get_ia_nativa
    global _get_maintenance_mode, _set_maintenance_mode, _ban_manager
    _check_jwt = check_jwt
    _db = db
    _add_audit_log = add_audit_log
    _get_global_chat_names = get_global_chat_names
    _get_proxy_bot = get_proxy_bot
    _get_global_user_stats = get_global_user_stats
    _get_global_msg_log = get_global_msg_log
    _get_ia_nativa = get_ia_nativa
    _get_maintenance_mode = get_maintenance_mode
    _set_maintenance_mode = set_maintenance_mode
    _ban_manager = ban_manager
    return bp


@bp.route("/api/admin/broadcast", methods=["POST"])
def web_admin_broadcast():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    msg = request.json.get("message", "")
    if not msg:
        return jsonify({"ok": False, "msg": "Mensaje vacio"}), 400
    proxy_bot = _get_proxy_bot()
    count = 0
    for cid in _get_global_chat_names():
        if proxy_bot and proxy_bot.send_msg(cid, f"COMUNICADO GLOBAL:\n\n{msg}"):
            count += 1
    _add_audit_log(f"Broadcast enviado a {count} chats")
    return jsonify({"ok": True, "count": count})


@bp.route("/api/admin/maintenance", methods=["POST"])
def web_admin_maintenance():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    new_status = not bool(_get_maintenance_mode())
    _set_maintenance_mode(new_status)
    return jsonify({"ok": True, "enabled": new_status})


@bp.route("/api/admin/shield", methods=["POST"])
def web_admin_shield():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    status = not _db.get("NEURAL_SHIELD", True)
    _db.set("NEURAL_SHIELD", status)
    return jsonify({"ok": True, "enabled": status})


@bp.route("/api/admin/summary")
def web_admin_summary():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    global_bans = _db.get("GLOBAL_BANS", {})
    if not isinstance(global_bans, dict):
        global_bans = {}
    return jsonify({
        "ok": True,
        "total_users": len(_db.keys("USER_")),
        "total_groups": len(_db.keys("ADMINS_")),
        "total_banned": len(global_bans.get("users", [])),
        "photos": _db.get("STATS_PHOTOS", 0),
        "videos": _db.get("STATS_VIDEOS", 0),
        "stats_24h": _db.get("IA_STATS_24H", {}),
    })


@bp.route("/api/admin/bans")
def web_admin_bans():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    global_bans = _db.get("GLOBAL_BANS", {})
    if not isinstance(global_bans, dict):
        global_bans = {}
    user_ids = [str(uid) for uid in global_bans.get("users", [])]

    # Recuperar la razon mas reciente de cada baneo global desde el historial.
    reasons = {}
    history = _db.get("BAN_HISTORY", [])
    if isinstance(history, list):
        for record in history:
            if not isinstance(record, dict):
                continue
            if record.get("scope") == "global" and record.get("action", "ban") == "ban":
                reason = record.get("reason")
                if reason:
                    reasons[str(record.get("uid", ""))] = reason

    bans = [{"user_id": uid, "reason": reasons.get(uid, "")} for uid in user_ids]
    return jsonify({"ok": True, "bans": bans})


@bp.route("/api/admin/unban", methods=["POST"])
def web_admin_unban():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    user_id = str((request.json or {}).get("user_id", "")).strip()
    if not user_id:
        return jsonify({"ok": False, "msg": "Falta user_id"}), 400

    global_bans = _db.get("GLOBAL_BANS", {})
    if not isinstance(global_bans, dict):
        global_bans = {"users": [], "hashes": []}
    global_bans.setdefault("users", [])

    if user_id not in [str(uid) for uid in global_bans["users"]]:
        return jsonify({"ok": False, "msg": "El usuario no esta baneado globalmente"}), 404

    # Usar el BanManager para que el set en memoria quede sincronizado y el
    # enforcer global no vuelva a banear al usuario en el siguiente mensaje.
    if _ban_manager is not None:
        _ban_manager.unban_user(user_id)
    else:
        global_bans["users"] = [uid for uid in global_bans["users"] if str(uid) != user_id]
        _db.set("GLOBAL_BANS", global_bans)
    _add_audit_log(f"Usuario {user_id} desbaneado globalmente desde el panel")
    return jsonify({"ok": True, "user_id": user_id})


@bp.route("/api/admin/backup", methods=["POST"])
def web_admin_backup():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    ia_nativa = _get_ia_nativa()
    data = {
        "stats": _get_global_user_stats(),
        "history": _get_global_msg_log(),
        "brain": ia_nativa.brain if ia_nativa else {},
    }
    fname = f"data/backup_{int(time.time())}.json"
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return jsonify({"ok": True, "file": fname})
