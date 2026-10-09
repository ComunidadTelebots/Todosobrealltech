import inspect
import os
import sys
import threading
import time

from flask import Blueprint, jsonify, request

bp = Blueprint("system_routes", __name__)

_check_jwt = None
_get_active_bots = None


def setup(check_jwt, get_active_bots):
    global _check_jwt, _get_active_bots
    _check_jwt = check_jwt
    _get_active_bots = get_active_bots
    return bp


@bp.route("/api/telegram/call", methods=["POST"])
def web_telegram_call():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    data = request.json
    method = data.get("method")
    params = data.get("params", {})
    idx = data.get("bot_idx", 0)
    active_bots = _get_active_bots()
    if not method:
        return jsonify({"ok": False, "msg": "Metodo requerido"}), 400
    if idx >= len(active_bots):
        return jsonify({"ok": False, "msg": "Bot no encontrado"}), 404
    bot = active_bots[idx]
    if hasattr(bot, method):
        func = getattr(bot, method)
        try:
            sig = inspect.signature(func)
            res = func(**{k: v for k, v in params.items() if k in sig.parameters})
        except Exception:
            res = bot.api_call(method, params)
    else:
        res = bot.api_call(method, params)
    return jsonify(res)


@bp.route("/api/reboot", methods=["POST"])
def web_reboot():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    threading.Thread(target=lambda: (time.sleep(1), os.execv(sys.executable, ["python"] + sys.argv))).start()
    return jsonify({"ok": True})
