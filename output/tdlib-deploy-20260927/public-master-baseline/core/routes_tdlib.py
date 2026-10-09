from flask import Blueprint, request, jsonify

bp = Blueprint("tdlib", __name__)

_check_jwt = None
_tdlib_client = None


def setup(check_jwt, tdlib_client):
    global _check_jwt, _tdlib_client
    _check_jwt = check_jwt
    _tdlib_client = tdlib_client
    return bp


@bp.route("/api/tdlib/status")
def api_tdlib_status():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if not _tdlib_client:
        return jsonify({"ok": True, "enabled": False, "reason": "TDLIB_API_ID/TDLIB_API_HASH no configurados"})
    return jsonify({"ok": True, "enabled": True, **_tdlib_client.get_status()})


@bp.route("/api/tdlib/auth", methods=["POST"])
def api_tdlib_auth():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if not _tdlib_client:
        return jsonify({"ok": False, "error": "TDLib no habilitado"}), 400
    d = request.json or {}
    action = d.get("action")
    value = d.get("value", "")
    if action == "phone":
        _tdlib_client.auth_set_phone(value)
    elif action == "code":
        _tdlib_client.auth_set_code(value)
    elif action == "password":
        _tdlib_client.auth_set_password(value)
    else:
        return jsonify({"ok": False, "error": "action debe ser phone, code o password"}), 400
    return jsonify({"ok": True, "auth_state": _tdlib_client._auth_state})


@bp.route("/api/tdlib/userbot", methods=["GET", "POST"])
def api_tdlib_userbot():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if not _tdlib_client:
        return jsonify({"ok": False, "error": "TDLib no habilitado"}), 400
    if request.method == "GET":
        return jsonify({"ok": True, "userbot_enabled": _tdlib_client.userbot_enabled, "me": _tdlib_client._me})
    enabled = (request.json or {}).get("enabled")
    if enabled is None:
        return jsonify({"ok": False, "error": "Campo 'enabled' requerido"}), 400
    _tdlib_client.set_userbot(bool(enabled))
    return jsonify({"ok": True, "userbot_enabled": _tdlib_client.userbot_enabled})


@bp.route("/api/tdlib/sync", methods=["POST"])
def api_tdlib_sync():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if not _tdlib_client:
        return jsonify({"ok": False, "error": "TDLib no habilitado"}), 400
    d = request.json or {}
    chat_id = d.get("chat_id")
    if not chat_id:
        return jsonify({"ok": False, "error": "chat_id requerido"}), 400
    imported = _tdlib_client.sync_to_db(int(chat_id), int(d.get("limit", 200)))
    return jsonify({"ok": True, "imported": imported, "chat_id": chat_id})
