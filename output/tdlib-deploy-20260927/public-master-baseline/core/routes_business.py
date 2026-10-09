from flask import Blueprint, request, jsonify

bp = Blueprint("business", __name__)

_check_jwt = None
_db = None
_get_proxy_bot = None


def setup(check_jwt, db, get_proxy_bot):
    global _check_jwt, _db, _get_proxy_bot
    _check_jwt = check_jwt
    _db = db
    _get_proxy_bot = get_proxy_bot
    return bp


@bp.route("/api/business/status")
def business_status():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    proxy_bot = _get_proxy_bot()
    if not proxy_bot:
        return jsonify({"ok": True, "connections": []})
    conns = []
    for cid, conn in proxy_bot.telegram_events.list_business_connections().items():
        conns.append({
            "id": cid,
            "user": conn.get("user", {}).get("first_name", "Business"),
            "enabled": conn.get("is_enabled", False),
        })
    return jsonify({"ok": True, "connections": conns})


@bp.route("/api/business/config", methods=["GET", "POST"])
def business_config():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if request.method == "POST":
        _db.set("BUSINESS_CONFIG", request.json)
        return jsonify({"ok": True})
    return jsonify({"ok": True, "config": _db.get("BUSINESS_CONFIG", {
        "greeting": "", "away": "", "away_mode": False, "ia_auto": False
    })})


@bp.route("/api/business/quick_replies", methods=["GET", "POST"])
def business_quick_replies():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if request.method == "POST":
        _db.set("BUSINESS_QUICK_REPLIES", request.json)
        return jsonify({"ok": True})
    return jsonify({"ok": True, "replies": _db.get("BUSINESS_QUICK_REPLIES", [])})
