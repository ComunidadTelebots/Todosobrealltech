from flask import Blueprint, request, jsonify

bp = Blueprint("queue", __name__)

_check_jwt = None
_task_queue = None


def setup(check_jwt, task_queue):
    global _check_jwt, _task_queue
    _check_jwt = check_jwt
    _task_queue = task_queue
    return bp


@bp.route("/api/queue/list")
def api_queue_list():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "queue": _task_queue.get_all()})


@bp.route("/api/queue/cancel", methods=["POST"])
def api_queue_cancel():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _task_queue.cancel(request.json.get("id"))
    return jsonify({"ok": True})


@bp.route("/api/queue/prioritize", methods=["POST"])
def api_queue_prioritize():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _task_queue.prioritize(request.json.get("id"))
    return jsonify({"ok": True})
