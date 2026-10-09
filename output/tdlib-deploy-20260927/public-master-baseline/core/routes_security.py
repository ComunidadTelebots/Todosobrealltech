import requests as _requests

from flask import Blueprint, request, jsonify

bp = Blueprint("security", __name__)

_check_jwt = None
_db = None
_vt_mgr = None
_add_web_log = None
_check_cas_status = None


def setup(check_jwt, db, vt_mgr, add_web_log, check_cas_status):
    global _check_jwt, _db, _vt_mgr, _add_web_log, _check_cas_status
    _check_jwt = check_jwt
    _db = db
    _vt_mgr = vt_mgr
    _add_web_log = add_web_log
    _check_cas_status = check_cas_status
    return bp


@bp.route("/api/health/telegram")
def api_health_telegram():
    try:
        r = _requests.get("https://api.telegram.org", timeout=5)
        return jsonify({
            "ok": True,
            "status": "ONLINE" if r.status_code == 200 else "DEGRADED",
            "ping": f"{int(r.elapsed.total_seconds() * 1000)}ms",
        })
    except Exception:
        return jsonify({"ok": True, "status": "OFFLINE", "ping": "N/A"})


@bp.route("/api/security/vt/scan", methods=["POST"])
def api_security_vt_scan():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    file_hash = request.json.get("hash")
    if not file_hash:
        return jsonify({"ok": False, "error": "Hash faltante"}), 400
    return jsonify(_vt_mgr.scan_hash(file_hash))


@bp.route("/api/security/cas/check/<uid>")
def api_security_cas_check(uid):
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    status = _check_cas_status(uid, use_cache=False)
    return jsonify({"ok": True, "cas_banned": status.get("banned", False), "cas": status})


@bp.route("/api/security/audit")
def api_security_audit():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "logs": _db.get("SECURITY_AUDIT_LOGS", [])})


@bp.route("/api/vision/stats")
def get_vision_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({
        "ok": True,
        "photos": _db.get("STATS_PHOTOS", 0),
        "videos": _db.get("STATS_VIDEOS", 0),
        "threats": len(_db.get("BANNED_HASHES", [])),
        "shield_enabled": _db.get("NEURAL_SHIELD", True),
    })


@bp.route("/api/security/blacklist")
def get_security_blacklist():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({
        "ok": True,
        "blacklist": _db.get("BANNED_HASHES", []),
        "sync_urls": _db.get("SECURITY_SYNC_URLS", []),
    })


@bp.route("/api/security/add_sync_url", methods=["POST"])
def add_security_sync_url():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    url = request.json.get("url")
    if url:
        urls = _db.get("SECURITY_SYNC_URLS", [])
        if url not in urls:
            urls.append(url)
            _db.set("SECURITY_SYNC_URLS", urls)
        return jsonify({"ok": True})
    return jsonify({"ok": False})


@bp.route("/api/security/ban_hash", methods=["POST"])
def add_security_hash():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    h = request.json.get("hash")
    if h:
        banned = _db.get("BANNED_HASHES", [])
        if h not in banned:
            banned.append(h)
            _db.set("BANNED_HASHES", banned)
            _add_web_log("SECURITY", f"Manual Ban (Web): Hash {h} añadido.")
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "No hash provided"})
