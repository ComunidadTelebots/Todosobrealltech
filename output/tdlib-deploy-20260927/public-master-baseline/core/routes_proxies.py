from flask import Blueprint, request, jsonify

bp = Blueprint("proxies", __name__)

_check_jwt = None
_db = None
_proxy_mgr = None
_add_web_log = None


def setup(check_jwt, db, proxy_mgr, add_web_log):
    global _check_jwt, _db, _proxy_mgr, _add_web_log
    _check_jwt = check_jwt
    _db = db
    _proxy_mgr = proxy_mgr
    _add_web_log = add_web_log
    return bp


@bp.route("/api/proxies/stats")
def api_proxies_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "proxies": _proxy_mgr.get_stats()})


@bp.route("/api/proxies/vps/config", methods=["GET", "POST"])
def api_proxies_vps_config():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if request.method == "POST":
        cfg = _proxy_mgr.save_vps_config(request.json or {})
        return jsonify({"ok": True, "config": cfg})
    return jsonify({"ok": True, "config": _proxy_mgr.get_vps_config(include_secret=False)})


@bp.route("/api/proxies/vps/stats")
def api_proxies_vps_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    try:
        return jsonify({"ok": True, "stats": _proxy_mgr.get_vps_real_stats()})
    except Exception as e:
        _add_web_log("ERROR", f"Fallo obteniendo stats VPS MTProto: {e}")
        return jsonify({"ok": False, "error": str(e)})


@bp.route("/api/proxies/add", methods=["POST"])
def api_proxies_add():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _proxy_mgr.proxies.append(request.json)
    _db.set("PROXY_CONFIGS", _proxy_mgr.proxies)
    return jsonify({"ok": True})


@bp.route("/api/proxies/toggle", methods=["POST"])
def api_proxies_toggle():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    index = request.json.get("index")
    action = request.json.get("action")
    res = _proxy_mgr.start_proxy(index) if action == "start" else _proxy_mgr.stop_proxy(index)
    return jsonify({"ok": res})


@bp.route("/api/proxies/remove", methods=["POST"])
def api_proxies_remove():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    index = request.json.get("index")
    _proxy_mgr.stop_proxy(index)
    _proxy_mgr.proxies.pop(index)
    _db.set("PROXY_CONFIGS", _proxy_mgr.proxies)
    return jsonify({"ok": True})


@bp.route("/api/proxies/scan")
def api_proxies_scan():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "detected": _proxy_mgr.scan_docker()})
