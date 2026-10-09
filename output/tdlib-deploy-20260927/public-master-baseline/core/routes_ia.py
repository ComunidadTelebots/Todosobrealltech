import csv
import datetime
import io
import json
import os
import re
import threading

import requests
from flask import Blueprint, Response, jsonify, request, send_file

bp = Blueprint("ia", __name__)

_check_jwt = None
_db = None
_add_web_log = None
_add_audit_log = None
_get_ia_nativa = None
_get_proxy_bot = None
_get_active_audits = None
_get_global_chat_history = None
_get_global_chat_names = None
_moon_env = None
_db_path = None
_master_id = None
_get_ollama_url = None
_set_ollama_url = None
_get_ia_runtime_config = None
_set_ia_runtime_config = None


def setup(
    check_jwt,
    db,
    add_web_log,
    add_audit_log,
    get_ia_nativa,
    get_proxy_bot,
    get_active_audits,
    get_global_chat_history,
    get_global_chat_names,
    moon_env,
    db_path,
    master_id,
    get_ollama_url,
    set_ollama_url,
    get_ia_runtime_config,
    set_ia_runtime_config,
):
    global _check_jwt, _db, _add_web_log, _add_audit_log, _get_ia_nativa, _get_proxy_bot
    global _get_active_audits, _get_global_chat_history, _get_global_chat_names, _moon_env
    global _db_path, _master_id, _get_ollama_url, _set_ollama_url
    global _get_ia_runtime_config, _set_ia_runtime_config
    _check_jwt = check_jwt
    _db = db
    _add_web_log = add_web_log
    _add_audit_log = add_audit_log
    _get_ia_nativa = get_ia_nativa
    _get_proxy_bot = get_proxy_bot
    _get_active_audits = get_active_audits
    _get_global_chat_history = get_global_chat_history
    _get_global_chat_names = get_global_chat_names
    _moon_env = moon_env
    _db_path = db_path
    _master_id = master_id
    _get_ollama_url = get_ollama_url
    _set_ollama_url = set_ollama_url
    _get_ia_runtime_config = get_ia_runtime_config
    _set_ia_runtime_config = set_ia_runtime_config
    return bp


def _start_audit_logic(cid, cid_input=None):
    active_audits = _get_active_audits()
    proxy_bot = _get_proxy_bot()
    if cid in active_audits and active_audits[cid].get("name") and active_audits[cid]["name"] != str(cid):
        return
    cid_input = cid_input or cid

    chat_name = cid
    if not str(cid_input).startswith("@"):
        res_info = proxy_bot.api_call("getChat", {"chat_id": cid})
        if res_info.get("ok"):
            chat_data = res_info["result"]
            chat_name = chat_data.get("title") or chat_data.get("first_name") or cid
            names = _db.get("CHAT_NAMES", {})
            names[cid] = chat_name
            _db.set("CHAT_NAMES", names)
            potentials = _db.get("POTENTIAL_FEEDERS", {})
            if cid in potentials:
                potentials[cid]["name"] = chat_name
                _db.set("POTENTIAL_FEEDERS", potentials)
            if chat_data.get("username"):
                cid_input = f"@{chat_data['username']}"
                _add_web_log("DEBUG", f"ID {cid} resuelto a alias {cid_input} para scraping.")
    else:
        res_info = proxy_bot.api_call("getChat", {"chat_id": cid_input})
        if res_info.get("ok"):
            chat_name = res_info["result"].get("title") or res_info["result"].get("first_name") or cid_input
            names = _db.get("CHAT_NAMES", {})
            names[cid] = chat_name
            _db.set("CHAT_NAMES", names)

    prev_msgs = []
    if cid_input.startswith("@"):
        _add_web_log("INFO", f"Scraping preventivo para {cid_input}...")
        try:
            url = f"https://t.me/s/{cid_input[1:]}"
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            if r.status_code == 200:
                matches = re.findall(r'<div class="tgme_widget_message_text[^"]*".*?>(.*?)</div>', r.text, re.DOTALL)
                prev_msgs = [re.sub(r"<.*?>", "", m) for m in matches]
        except Exception:
            pass

    history = _db.get("GLOBAL_HISTORY", [])
    internal_msgs = [m["text"] for m in history if str(m.get("cid")) == cid]
    all_msgs = list(dict.fromkeys(prev_msgs + internal_msgs))

    score = 0
    for t in all_msgs:
        words = str(t).split()
        unique_words = len(set(words))
        score += (unique_words * 2) + (len(str(t)) // 10)

    status = "listening"
    final_score = 0
    report = None
    if len(all_msgs) >= 15:
        status = "finished"
        final_score = min(100, (score // 15) * 5)
        all_text = " ".join(all_msgs[:15])
        words_rep = all_text.split()
        settings = _db.get("GLOBAL_SETTINGS", {})
        threshold = int(settings.get("audit_threshold", 60))
        report = {
            "time": datetime.datetime.now().strftime("%d/%m %H:%M"),
            "chat": chat_name,
            "cid": cid,
            "score": final_score,
            "avg_len": len(all_text) // 15,
            "unique_words": len(set(words_rep)),
            "verdict": "RECOMENDADO" if final_score >= threshold else "NO RECOMENDADO",
        }
        hist = _db.get("IA_AUDIT_HISTORY", [])
        hist.append(report)
        _db.set("IA_AUDIT_HISTORY", hist[-50:])
        _add_web_log("SUCCESS", f"Reporte guardado en historial para {cid}")

    active_audits[cid] = {
        "name": chat_name,
        "messages": all_msgs,
        "score": score,
        "status": status,
        "final_score": final_score,
        "report": report,
        "start": __import__("time").time(),
    }
    _db.set("ACTIVE_AUDITS", active_audits)
    _add_web_log("DEBUG", f"Auditoria INICIALIZADA para {cid}. Mensajes pre-cargados: {len(all_msgs)}")


@bp.route("/api/ia/search", methods=["POST"])
def web_ia_search():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    query = request.json.get("query")
    if not query:
        return jsonify({"ok": False})
    _add_web_log("IA", f"Neuro-Busqueda iniciada: {query}")
    res = _get_ia_nativa().search_web(query)
    return jsonify({"ok": True, "result": res})


@bp.route("/api/ia/multilingual", methods=["POST"])
def web_ia_multilingual():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    threading.Thread(target=_get_ia_nativa().seed_multilingual).start()
    return jsonify({"ok": True})


@bp.route("/api/ia/translations")
def web_translations():
    if os.path.exists("data/translations.json"):
        with open("data/translations.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"ok": True, "translations": data})
    return jsonify({"ok": False})


@bp.route("/api/ia/translate_all", methods=["POST"])
def web_ia_translate_all():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    target_lang = request.json.get("lang", "fr")
    if os.path.exists("data/translations.json"):
        with open("data/translations.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        base = data.get("es", {})
        new_trans = {}
        ia_nativa = _get_ia_nativa()
        _add_web_log("IA", f"Generando traducciones para {target_lang}...")
        for key, text in base.items():
            prompt = f"Traduce este termino de Dashboard de Telegram al idioma {target_lang}. Solo devuelve la traduccion: {text}"
            translated = ia_nativa.generate(prompt)
            translated = ia_nativa.translate_text(text, target_lang) or translated
            new_trans[key] = translated.strip()
        data[target_lang] = new_trans
        with open("data/translations.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return jsonify({"ok": True, "lang": target_lang})
    return jsonify({"ok": False})


@bp.route("/api/ia/translate", methods=["POST"])
def web_ia_translate():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    payload = request.json or {}
    text = payload.get("text", "")
    target_lang = payload.get("target_lang") or payload.get("lang", "es")
    source_lang = payload.get("source_lang")
    if not text:
        return jsonify({"ok": False, "msg": "Texto vacio"}), 400
    ia_nativa = _get_ia_nativa()
    translated, engine = ia_nativa.translate_text(text, target_lang, source_lang=source_lang, return_meta=True)
    return jsonify(
        {
            "ok": True,
            "source_lang": source_lang or ia_nativa.detect_lang(text),
            "target_lang": ia_nativa.normalize_language_code(target_lang),
            "translated": translated,
            "engine": engine,
        }
    )


@bp.route("/api/ia/stats")
def web_ia_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    try:
        ia_nativa = _get_ia_nativa()
        proxy_bot = _get_proxy_bot()
        feeders = _db.get("IA_FEEDERS", [])
        if not isinstance(feeders, list):
            feeders = []
        resolved = []
        for cid in feeders:
            try:
                res = proxy_bot.api_call("getChat", {"chat_id": cid}, silent=True)
                name = res.get("result", {}).get("title") or res.get("result", {}).get("username") or cid
                chk = proxy_bot.api_call("getChatMember", {"chat_id": cid, "user_id": proxy_bot.bot_id}, silent=True)
                status_text = "OFFLINE"
                if chk.get("ok"):
                    st = chk["result"].get("status")
                    if st in ["administrator", "creator"]:
                        status_text = "ADMIN"
                    elif st == "member":
                        status_text = "ONLINE"
                    elif st in ["left", "kicked"]:
                        status_text = "BANEADO/EXPULSADO"
                last_msg = _db.get(f"FEEDER_LAST_{cid}", "Sin actividad")
                resolved.append({"id": cid, "name": name, "status": status_text, "last": last_msg})
            except Exception:
                resolved.append({"id": cid, "name": cid, "status": "ERROR", "last": "N/A"})
        return jsonify(
            {
                "ok": True,
                "stats": ia_nativa.get_stats(),
                "feeders": resolved,
                "potentials": _db.get("POTENTIAL_FEEDERS", {}),
                "lang_counts": _db.get("IA_LANG_COUNTS", {}),
                "ia_mode": ia_nativa.mode,
                "ia_mood": ia_nativa.mood,
                "moon_env": _moon_env,
                "listen_mode": _db.get("LISTEN_MODE", False),
                "supported_languages": list(_db.get("IA_LANG_COUNTS", {}).keys()) or ["es", "en"],
            }
        )
    except Exception as e:
        _add_web_log("ERROR", f"Fallo critico en /api/ia/stats: {str(e)}")
        return jsonify({"ok": False, "msg": "Error interno del servidor"})


@bp.route("/api/ia/inline_stats")
def web_ia_inline_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    try:
        proxy_bot = _get_proxy_bot()
        if proxy_bot and hasattr(proxy_bot, "invoked_ai"):
            stats = proxy_bot.invoked_ai.get_ai_statistics()
        else:
            raw = _db.get("INLINE_GUEST_AI_STATS", {})
            total = raw.get("inline_total", 0) + raw.get("guest_total", 0)
            avg_time = raw.get("total_time", 0) / max(1, total)
            success_rate = (raw.get("success_count", 0) / max(1, total)) * 100
            stats = {
                "summary": {
                    "total_requests": total,
                    "inline_requests": raw.get("inline_total", 0),
                    "guest_requests": raw.get("guest_total", 0),
                    "success_rate_percent": round(success_rate, 2),
                    "avg_response_time_ms": round(avg_time * 1000, 2),
                },
                "ai_distribution": {
                    "ollama": raw.get("ollama_count", 0),
                    "gemini": raw.get("gemini_count", 0),
                    "hybrid": raw.get("hybrid_count", 0),
                },
                "results": {"success": raw.get("success_count", 0), "failed": raw.get("failed_count", 0)},
                "recent_events": raw.get("recent_events", [])[-20:],
            }
        settings = _db.get("GLOBAL_SETTINGS", {})
        stats["default_ai_mode"] = settings.get("default_ai_mode", "hybrid")
        return jsonify({"ok": True, **stats})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)})


@bp.route("/api/ia/inline_stats/set_default", methods=["POST"])
def web_ia_set_default_ai():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    data = request.get_json(silent=True) or {}
    mode = data.get("mode", "hybrid")
    if mode not in ["ollama", "gemini", "hybrid"]:
        return jsonify({"ok": False, "msg": "Modo invalido. Usa: ollama, gemini, hybrid"})
    settings = _db.get("GLOBAL_SETTINGS", {})
    old = settings.get("default_ai_mode", "hybrid")
    settings["default_ai_mode"] = mode
    _db.set("GLOBAL_SETTINGS", settings)
    _add_web_log("INFO", f"IA por defecto cambiada de {old} a {mode} desde el dashboard")
    return jsonify({"ok": True, "old": old, "new": mode})


@bp.route("/api/ia/potentials")
def web_ia_potentials():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "potentials": _db.get("POTENTIAL_FEEDERS", {})})


@bp.route("/api/ia/potentials/clear", methods=["POST"])
def web_ia_potentials_clear():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _db.set("POTENTIAL_FEEDERS", {})
    return jsonify({"ok": True})


@bp.route("/api/ia/feeders/remove", methods=["POST"])
def web_ia_feeders_remove():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    cid = str(request.json.get("id"))
    feeders = _db.get("IA_FEEDERS", [])
    if cid in feeders:
        feeders.remove(cid)
        _db.set("IA_FEEDERS", feeders)
        _add_audit_log(f"Fuente de aprendizaje (ID {cid}) eliminada.")
        return jsonify({"ok": True, "msg": "Fuente eliminada."})
    return jsonify({"ok": False, "msg": "Fuente no encontrada."})


@bp.route("/api/ia/audit/history/clear", methods=["POST"])
def web_ia_audit_history_clear():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _db.set("IA_AUDIT_HISTORY", [])
    _add_audit_log("Historial de auditorias vaciado manualmente.")
    return jsonify({"ok": True, "msg": "Historial limpiado."})


@bp.route("/api/ia/audit/start", methods=["POST"])
def web_ia_audit_start():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    proxy_bot = _get_proxy_bot()
    cid_input = str(request.json.get("id"))
    if not cid_input:
        return jsonify({"ok": False, "msg": "ID requerido"})
    cid = cid_input
    if cid_input.startswith("@"):
        res_info = proxy_bot.api_call("getChat", {"chat_id": cid_input})
        if res_info.get("ok"):
            cid = str(res_info["result"].get("id"))
    if not cid_input.startswith("@"):
        chk = proxy_bot.api_call("getChatMember", {"chat_id": cid, "user_id": proxy_bot.bot_id})
        if not chk.get("ok") or chk["result"].get("status") in ["left", "kicked"]:
            return jsonify({"ok": False, "msg": "Error: El bot DEBE estar dentro del grupo."})
    _start_audit_logic(cid, cid_input)
    return jsonify({"ok": True})


@bp.route("/api/ia/audit/status")
def web_ia_audit_status():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    active_audits = _get_active_audits()
    potentials = _db.get("POTENTIAL_FEEDERS", {})
    feeders = _db.get("IA_FEEDERS", [])
    for cid in potentials:
        has_name = active_audits.get(cid, {}).get("name")
        if (cid not in active_audits or not has_name or has_name == cid) and cid not in feeders:
            _start_audit_logic(cid)
    return jsonify({"ok": True, "audits": active_audits})


@bp.route("/api/ia/audit/history")
def web_ia_audit_history():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    hist = _db.get("IA_AUDIT_HISTORY", [])
    return jsonify({"ok": True, "history": hist[::-1]})


@bp.route("/api/ia/audit/export")
def web_ia_audit_export():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    cid = request.args.get("id")
    if not cid:
        return "ID requerido", 400
    history = _db.get("GLOBAL_HISTORY", [])
    msgs = [m for m in history if str(m.get("cid")) == str(cid)]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Usuario", "Mensaje"])
    for m in msgs:
        writer.writerow([m.get("time"), m.get("user"), m.get("text")])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=audit_{cid}.csv"},
    )


@bp.route("/api/global/history")
def web_global_history():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "history": _db.get("GLOBAL_HISTORY", [])})


@bp.route("/api/admin/settings", methods=["GET", "POST"])
def web_settings():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if request.method == "GET":
        settings = _db.get("GLOBAL_SETTINGS", {"welcome_msg": "Bienvenido al bot!"})
        if not isinstance(settings, dict):
            settings = {"welcome_msg": "Bienvenido al bot!"}
        if not settings.get("google_analytics_id"):
            settings["google_analytics_id"] = os.getenv("GOOGLE_ANALYTICS_ID", "")
        settings.setdefault("cookie_banner_enabled", "on")
        settings.setdefault("analytics_enabled", "on")
        return jsonify({"ok": True, "settings": settings})
    _db.set("GLOBAL_SETTINGS", request.json)
    return jsonify({"ok": True})


@bp.route("/api/ia/feeders/add", methods=["POST"])
def web_ia_feeder_add():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    try:
        raw_link = request.json.get("link", "").strip()
        if not raw_link:
            return jsonify({"ok": False, "msg": "Enlace vacio"})
        link = raw_link.split("/")[-1].replace("@", "")
        target = f"@{link}" if not (link.startswith("-100") or link.startswith("-")) else link
        _add_web_log("INFO", f"Intentando vincular IA Feeder: {target}")
        proxy_bot = _get_proxy_bot()
        if not proxy_bot:
            return jsonify({"ok": False, "msg": "No hay un bot activo para realizar la busqueda."})
        res = proxy_bot.api_call("getChat", {"chat_id": target})
        if res.get("ok"):
            cid = str(res["result"]["id"])
            title = res["result"].get("title") or res["result"].get("username") or cid
            _get_global_chat_names()[cid] = title
            f = _db.get("IA_FEEDERS", [])
            if cid not in f:
                f.append(cid)
                _db.set("IA_FEEDERS", f)
            potentials = _db.get("POTENTIAL_FEEDERS", {})
            if cid in potentials:
                del potentials[cid]
                _db.set("POTENTIAL_FEEDERS", potentials)
            active_audits = _get_active_audits()
            if cid in active_audits:
                del active_audits[cid]
            _add_web_log("SUCCESS", f"IA Feeder vinculado: {title}")
            return jsonify({"ok": True, "name": title})
        _add_web_log("ERROR", f"Fallo al vincular {target}: {res.get('description')}")
        return jsonify({"ok": False, "msg": f"Error de Telegram: {res.get('description', 'No se pudo encontrar el grupo.')}"})
    except Exception as e:
        _add_web_log("ERROR", f"Crash en vinculacion: {str(e)}")
        return jsonify({"ok": False, "msg": f"Error interno: {str(e)}"}), 500


@bp.route("/api/ia/library")
def web_ia_library():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    activity = _db.get("IA_ACTIVITY", [])
    library = activity[::-1]
    top_sources = _get_ia_nativa().get_top_sources()
    return jsonify({"ok": True, "library": library, "top_sources": top_sources})


@bp.route("/api/ia/evolve", methods=["POST"])
def web_ia_evolve():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    threading.Thread(target=_get_ia_nativa().evolve_process).start()
    return jsonify({"ok": True, "msg": "Proceso de evolucion iniciado."})


@bp.route("/api/ia/config", methods=["GET", "POST"])
def api_ia_config():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if request.method == "POST":
        data = request.json
        cfg = _get_ia_runtime_config()
        cfg["USE_EXTERNAL_LLM"] = data.get("use_external", cfg["USE_EXTERNAL_LLM"])
        cfg["GEMINI_API_KEY"] = data.get("api_key", cfg["GEMINI_API_KEY"])
        cfg["HYBRID_PERCENTAGE"] = int(data.get("hybrid_ratio", cfg["HYBRID_PERCENTAGE"]))
        cfg["LLM_PROVIDER"] = data.get("provider", cfg["LLM_PROVIDER"])
        cfg["OLLAMA_MODEL"] = data.get("ollama_model", cfg["OLLAMA_MODEL"])
        if data.get("provider") in ["ollama", "gemini"]:
            cfg["USE_EXTERNAL_LLM"] = True
        if data.get("ollama_url"):
            _set_ollama_url(data.get("ollama_url"))
        cfg["DEEP_DREAM_MODE"] = data.get("deep_dream", cfg["DEEP_DREAM_MODE"])
        _set_ia_runtime_config(cfg)
        _add_web_log(
            "IA",
            "Config actualizada: "
            f"Provider={cfg['LLM_PROVIDER']}, External={cfg['USE_EXTERNAL_LLM']}, "
            f"Model={cfg['OLLAMA_MODEL']}, Dream={cfg['DEEP_DREAM_MODE']}",
        )
        return jsonify({"ok": True, "msg": "Configuracion de IA actualizada"})
    cfg = _get_ia_runtime_config()
    return jsonify(
        {
            "ok": True,
            "use_external": cfg["USE_EXTERNAL_LLM"],
            "api_key": "***" if cfg["GEMINI_API_KEY"] else "",
            "hybrid_ratio": cfg["HYBRID_PERCENTAGE"],
            "provider": cfg["LLM_PROVIDER"],
            "ollama_model": cfg["OLLAMA_MODEL"],
            "ollama_url": _get_ollama_url(),
            "deep_dream": cfg["DEEP_DREAM_MODE"],
        }
    )


@bp.route("/api/ia/ollama/test", methods=["POST"])
def api_ia_ollama_test():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    urls_to_try = []
    custom_url = (request.json or {}).get("url", "")
    if custom_url:
        urls_to_try.append(custom_url.rstrip("/"))
    urls_to_try.extend(["http://localhost:11434", "http://localhost:11435", "http://127.0.0.1:11434", "http://moon_ollama:11434"])
    for base_url in urls_to_try:
        try:
            r = requests.get(f"{base_url}/api/tags", timeout=5)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                _set_ollama_url(f"{base_url}/api/generate")
                _add_web_log("IA", f"Ollama detectado en {base_url} con {len(models)} modelo(s)")
                return jsonify(
                    {
                        "ok": True,
                        "url": base_url,
                        "generate_url": _get_ollama_url(),
                        "models": models,
                        "msg": f"Conectado a Ollama ({base_url}). Modelos: {', '.join(models) if models else 'Ninguno instalado'}",
                    }
                )
        except Exception:
            continue
    _add_web_log("ERROR", "No se pudo conectar con Ollama en ninguna URL conocida")
    return jsonify(
        {
            "ok": False,
            "msg": "No se pudo conectar con Ollama. Asegurate de que esta ejecutandose.",
            "tried": urls_to_try,
        }
    )


@bp.route("/api/ia/master_seed", methods=["POST"])
def api_ia_master_seed():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    threading.Thread(target=_get_ia_nativa().seed_master_intelligence).start()
    return jsonify({"ok": True, "msg": "Expansion Maestra iniciada"})


@bp.route("/api/ia/expand", methods=["POST"])
def api_ia_expand():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    data = request.json
    source = data.get("source", "wikipedia")
    items = data.get("items", "").split(",")
    if not items:
        return jsonify({"ok": False, "msg": "No hay elementos"})
    ia_nativa = _get_ia_nativa()
    if source == "wikipedia":
        threading.Thread(target=ia_nativa.seed_wikipedia_topics, args=(items, "es.wikipedia.org")).start()
    elif source == "wikisource":
        threading.Thread(target=ia_nativa.seed_wikipedia_topics, args=(items, "es.wikisource.org")).start()
    elif source == "gutenberg":
        threading.Thread(target=ia_nativa.seed_gutenberg_books, args=(items,)).start()
    elif source == "programming":
        threading.Thread(target=ia_nativa.seed_programming_knowledge, args=(items,)).start()
    return jsonify({"ok": True, "msg": f"Iniciado aprendizaje de {len(items)} fuentes de {source}"})


@bp.route("/api/ia/load_balancer", methods=["GET", "POST"])
def api_ia_load_balancer():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    ia_nativa = _get_ia_nativa()
    if request.method == "GET":
        return jsonify({"ok": True, "stats": ia_nativa.get_stats(), "state": ia_nativa.learning_balancer})
    data = request.json or {}
    action = data.get("action", "start")
    if action == "stop":
        return jsonify(ia_nativa.stop_learning_balancer())
    max_workers = data.get("max_workers")
    source_multiplier = int(data.get("source_multiplier", 3))
    if max_workers:
        cfg = _db.get("IA_LOAD_BALANCER", {})
        cfg["max_workers"] = max(1, min(int(max_workers), 32))
        _db.set("IA_LOAD_BALANCER", cfg)
    return jsonify(ia_nativa.start_learning_balancer(max_workers=max_workers, source_multiplier=source_multiplier))


@bp.route("/api/ia/backup", methods=["POST"])
def api_ia_backup():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    proxy_bot = _get_proxy_bot()
    if not _master_id or not proxy_bot:
        return jsonify({"ok": False, "msg": "Master ID no configurado"})
    db_file_path = "data/moon_database.db"
    if not os.path.exists(db_file_path):
        return jsonify({"ok": False, "msg": "Base de datos no encontrada"})
    size_mb = round(os.path.getsize(db_file_path) / (1024 * 1024), 2)

    def _manual_backup():
        proxy_bot.send_document(
            _master_id,
            db_file_path,
            f"Backup Manual Solicitado - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} ({size_mb} MB)",
        )

    threading.Thread(target=_manual_backup).start()
    return jsonify({"ok": True, "msg": "Backup enviado a tu Telegram"})


@bp.route("/api/ia/download", methods=["GET"])
def api_ia_download():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    if not os.path.exists(_db_path):
        return jsonify({"ok": False, "msg": "Base de datos no encontrada"}), 404
    fname = f"moon_brain_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    return send_file(os.path.abspath(_db_path), as_attachment=True, download_name=fname, mimetype="application/octet-stream")


@bp.route("/api/ia/restore", methods=["POST"])
def api_ia_restore():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    f = request.files.get("file")
    if not f or not f.filename.endswith(".db"):
        return jsonify({"ok": False, "msg": "Archivo .db requerido"})
    try:
        backup_path = _db_path + ".pre_restore"
        if os.path.exists(_db_path):
            import shutil

            shutil.copy2(_db_path, backup_path)
        f.save(_db_path)
        _add_web_log("SUCCESS", f"Base de datos restaurada desde archivo subido. Backup previo: {backup_path}")
        return jsonify({"ok": True, "msg": "Base de datos restaurada. Reinicia el servidor para aplicar los cambios."})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)})


@bp.route("/api/ia/force_feed", methods=["POST"])
def web_ia_force_feed():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    _get_ia_nativa().force_feed(_get_global_chat_history())
    return jsonify({"ok": True, "msg": "Alimentacion forzada completada"})


@bp.route("/api/ia/feeders", methods=["GET"])
def web_ia_feeders_stats():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    brain = _get_ia_nativa().brain
    words = len(brain["keywords"])
    conns = sum(len(v) for v in brain["patterns"].values())
    return jsonify({"ok": True, "words": words, "connections": conns})


@bp.route("/api/ia/mode", methods=["POST"])
def web_ia_set_mode():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    mode = request.json.get("mode", "balanced")
    _get_ia_nativa().set_mode(mode)
    return jsonify({"ok": True, "msg": f"Modo {mode} activado"})


@bp.route("/api/ia/mood", methods=["POST"])
def web_ia_set_mood():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    mood = request.json.get("mood", "friendly")
    _get_ia_nativa().set_mood(mood)
    return jsonify({"ok": True, "msg": f"Personalidad {mood} activada"})


@bp.route("/api/ia/test", methods=["POST"])
def web_ia_test():
    if not _check_jwt(request):
        return jsonify({"ok": False}), 401
    try:
        text = request.json.get("text", "")
        resp = _get_ia_nativa().generate(text)
        _add_web_log("IA", f"Prueba Web: {text} -> {resp}")
        return jsonify({"ok": True, "response": resp})
    except Exception as e:
        _add_web_log("ERROR", f"Fallo en Generacion IA: {str(e)}")
        return jsonify({"ok": False, "msg": str(e)}), 500
