import os

from flask import Blueprint, jsonify, request, send_from_directory

bp = Blueprint("ops_routes", __name__)

_check_jwt = None
_db = None
_add_audit_log = None


def setup(check_jwt, db, add_audit_log):
    global _check_jwt, _db, _add_audit_log
    _check_jwt = check_jwt
    _db = db
    _add_audit_log = add_audit_log
    return bp


@bp.route("/api/audit")
def web_audit():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "logs": _db.get("AUDIT_LOG", [])})


@bp.route("/api/logs/download")
def web_download_logs():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if os.path.exists("data/bot.log"):
        return send_from_directory("data", "bot.log", as_attachment=True)
    return jsonify({"ok": False, "msg": "No log file found."})


@bp.route("/api/automation/faq", methods=["GET"])
def web_faq_list():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    faq_db = _db.get("FAQ_DB", {})
    faq_answers = _db.get("FAQ_ANSWERS", {})
    merged = [{"question": q, "count": c, "answer": faq_answers.get(q, "")} for q, c in sorted(faq_db.items(), key=lambda x: x[1], reverse=True)]
    return jsonify({"ok": True, "faq": merged})


@bp.route("/api/automation/faq/set", methods=["POST"])
def web_faq_set():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    d = request.json or {}
    question = d.get("question", "").lower().strip()
    answer = d.get("answer", "").strip()
    if not question or not answer:
        return jsonify({"ok": False, "msg": "question y answer requeridos"})
    faq_answers = _db.get("FAQ_ANSWERS", {})
    faq_answers[question] = answer
    _db.set("FAQ_ANSWERS", faq_answers)
    _add_audit_log(f"FAQ Answer guardada: '{question[:40]}'")
    return jsonify({"ok": True})


@bp.route("/api/automation/faq/delete", methods=["POST"])
def web_faq_delete():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    question = (request.json or {}).get("question", "").lower().strip()
    faq_answers = _db.get("FAQ_ANSWERS", {})
    faq_db = _db.get("FAQ_DB", {})
    faq_answers.pop(question, None)
    faq_db.pop(question, None)
    _db.set("FAQ_ANSWERS", faq_answers)
    _db.set("FAQ_DB", faq_db)
    return jsonify({"ok": True})
