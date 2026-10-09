import os, sys, json, time, threading, logging, datetime, random, psutil, requests, jwt, importlib, re, struct, hashlib, subprocess, paramiko
from flask import Flask, request, jsonify, send_from_directory, Response, send_file
from dotenv import load_dotenv
from collections import Counter
from core.config import (
    APP_VERSION,
    BOT_STORE_PATH,
    WEB_PASSWORD,
    JWT_SECRET,
    MOON_ENV,
    MOON_ROLE,
    MASTER_ID,
    HUB_BOT_USERNAME,
    FLASK_PORT,
    FLASK_THREADS,
    GEMINI_API_KEY,
    USE_EXTERNAL_LLM,
    HYBRID_PERCENTAGE,
    LLM_PROVIDER,
    OLLAMA_MODEL,
    DEEP_DREAM_MODE,
    CAS_CACHE_TTL,
    TDLIB_API_ID,
    TDLIB_API_HASH,
    DB_PATH,
)
from core.db import DBManager
from core.telegram_api import (
    DEFAULT_ALLOWED_UPDATES,
    TELEGRAM_BOT_API_VERSION,
    build_get_updates_payload,
    normalize_method,
    telegram_api_call,
)
from core.invoked_ai import InvokedAIService
from core.telegram_events import TelegramEventStore
from core.proxy_manager import ProxyManager
from core.vt_manager import VirusTotalManager
from core.task_queue import TaskQueue
from core.tdlib_client import TDLibClient
from token_manager import token_manager
from ban_manager import BanManager

load_dotenv()

def _detect_ollama_url():
    """Auto-detecta la URL de Ollama: primero localhost, luego Docker"""
    env_url = os.getenv("OLLAMA_URL")
    if env_url:
        return env_url
    # Intentar localhost (Ollama nativo en Windows/Linux)
    for port in [11434, 11435]:
        try:
            requests.get(f"http://localhost:{port}/api/tags", timeout=2)
            return f"http://localhost:{port}/api/generate"
        except:
            pass
    # Fallback: hostname Docker
    return "http://moon_ollama:11434/api/generate"

OLLAMA_URL = _detect_ollama_url()
NEURAL_BILLION_TARGET = 1000000000000  # 1 billon en escala larga (1.000.000.000.000)
NEURAL_BILLION_DEADLINE_MIN = 12 * 60
DEFAULT_BOOK_SOURCE_IDS = [
    "84", "1342", "1661", "11", "2701", "345", "76", "98", "174", "5200",
    "2600", "4300", "1952", "1080", "1400", "46", "1260", "1232", "2554", "28054",
    "2591", "6130", "2542", "844", "16328", "160", "768", "1497", "45", "219",
    "205", "514", "829", "215", "36", "35", "74", "1998", "3207", "27827",
    "244", "14969", "4217", "7370", "730", "996", "236", "33283", "8800", "100",
    "1065", "2148", "932", "41", "2781", "2814", "209", "203", "1184", "120",
    "2156", "16", "55", "766", "1727", "6133", "1399", "51461", "43453", "1524",
    "158", "161", "105", "121", "1259", "10", "4363", "8297", "5827", "58585",
    "14977", "23700", "37106", "521", "3825", "2852", "408", "5740", "113", "600",
    "1322", "132", "58212", "3600", "1251", "135", "141", "142", "143", "145"
]

app = Flask(__name__)
# ConfiguraciÃ³n segÃºn ambiente
LOG_LEVEL = logging.DEBUG if MOON_ENV == "dev" else logging.INFO

logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("MoonBot")

db = DBManager()
ban_manager = BanManager(db)  # Gestor centralizado de baneos

task_queue = TaskQueue()
start_time = time.time()
bots_data = []
active_bots = []

def queue_worker():
    while True:
        try:
            if active_bots:
                task_queue.process_next(active_bots[0])
        except: pass
        time.sleep(1)

threading.Thread(target=queue_worker, daemon=True).start()

vt_mgr = VirusTotalManager(os.getenv("VT_API_KEY"))
proxy_mgr = ProxyManager(db)
tdlib_client = TDLibClient(TDLIB_API_ID, TDLIB_API_HASH, db) if TDLIB_API_ID and TDLIB_API_HASH else None
web_logs = []
flood_cache = {}  # {f"{cid}_{uid}": [timestamps]} â€” en memoria para evitar ops SQLite por mensaje
cas_cache = {}  # {uid: {"time": ts, "status": {...}}}
global_chat_history, global_chat_names, global_user_stats, global_media_list, global_msg_log = {}, {}, {}, [], []
maintenance_mode = False

_CHAT_HIST_MAX = 200  # mensajes mÃ¡ximos por chat en DB

def _append_chat_hist(cid, entry):
    """AÃ±ade un mensaje al historial en memoria y lo persiste en SQLite."""
    if cid not in global_chat_history:
        global_chat_history[cid] = db.get(f"CHAT_HIST_{cid}", [])
    global_chat_history[cid].append(entry)
    if len(global_chat_history[cid]) > _CHAT_HIST_MAX:
        global_chat_history[cid] = global_chat_history[cid][-_CHAT_HIST_MAX:]
    db.set(f"CHAT_HIST_{cid}", global_chat_history[cid])

voice_log = []
active_audits = db.get("ACTIVE_AUDITS", {}) # Persistencia de auditorÃ­as
listen_mode = db.get("LISTEN_MODE", False)  # Modo escucha: solo aprende, no responde
multilingual_seeds = {}
telemetry_history = {"cpu": [], "ram": [], "msgs": [], "time": []}

def telemetry_worker():
    while True:
        try:
            cpu = psutil.cpu_percent()
            mem = psutil.virtual_memory().percent
            t = datetime.datetime.now().strftime("%H:%M")
            
            telemetry_history["cpu"].append(cpu)
            telemetry_history["ram"].append(mem)
            telemetry_history["time"].append(t)
            
            # Mantener Ãºltimos 30 minutos
            if len(telemetry_history["cpu"]) > 30:
                for k in telemetry_history: telemetry_history[k].pop(0)
        except: pass
        time.sleep(60)

threading.Thread(target=telemetry_worker, daemon=True).start()

def add_web_log(lvl, txt):
    t = datetime.datetime.now().strftime("%H:%M:%S")
    web_logs.append({"time": t, "level": lvl, "text": txt})
    if len(web_logs) > 50: web_logs.pop(0)
    with open("data/bot.log", "a", encoding="utf-8") as f:
        f.write(f"[{t}] [{lvl}] {txt}\n")

# Wire logger into extracted modules now that add_web_log is available
task_queue._log = add_web_log
proxy_mgr._log = add_web_log
if tdlib_client:
    tdlib_client._log = add_web_log
    tdlib_client.start()

# Log inicial del sistema
add_web_log("INFO", "Sistema MoonBot iniciado y listo para operaciones.")

def add_audit_log(act):
    try:
        ip = request.remote_addr if request else "127.0.0.1"
        user_agent = request.headers.get("User-Agent", "N/A")
    except:
        ip = "127.0.0.1"
        user_agent = "N/A"
    
    log_entry = {
        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
        "ip": ip, 
        "action": act,
        "ua": user_agent
    }
    
    current_logs = db.get("SECURITY_AUDIT_LOGS", [])
    current_logs.append(log_entry)
    db.set("SECURITY_AUDIT_LOGS", current_logs[-100:]) # Guardar Ãºltimas 100 acciones
    
    # TambiÃ©n en el log general
    add_web_log("SECURITY", f"AcciÃ³n Auditada: {act} (IP: {ip})")


def _repair_mojibake(text):
    """Intenta reparar texto UTF-8 mal decodificado (mojibake) de forma segura."""
    if not isinstance(text, str) or not text:
        return text
    # Heurística: patrones muy comunes de mojibake en este proyecto
    noisy_markers = ("ðŸ", "Ã", "â", "Â")
    if not any(m in text for m in noisy_markers):
        return text
    try:
        raw = bytearray()
        for char in text:
            code = ord(char)
            if code <= 0xFF:
                raw.append(code)
            else:
                raw.extend(char.encode("cp1252"))
        fixed = raw.decode("utf-8", errors="strict")
        if fixed and fixed.count("�") <= text.count("�"):
            return fixed
    except Exception:
        pass
    for encoding in ("cp1252", "latin-1"):
        try:
            fixed = text.encode(encoding, errors="strict").decode("utf-8", errors="strict")
            # Evitar reemplazos que empeoren el texto
            if fixed and fixed.count("�") <= text.count("�"):
                return fixed
        except Exception:
            continue
    return text

def check_jwt(req):
    # Seguridad adicional: Whitelist de IPs si estÃ¡ configurado
    ip_whitelist = db.get("IP_WHITELIST", [])
    if ip_whitelist and req.remote_addr not in ip_whitelist:
        add_web_log("WARNING", f"Intento de acceso bloqueado desde IP no autorizada: {req.remote_addr}")
        return False

    auth = req.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        # Intentar desde query param para descargas
        tk = req.args.get("token")
        if tk: auth = f"Bearer {tk}"
        else: return False
    try: jwt.decode(auth.split(" ")[1], JWT_SECRET, algorithms=["HS256"]); return True
    except: return False

def bot_public_id(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]

def mask_bot_token(token):
    if not token:
        return ""
    if ":" in token:
        left, right = token.split(":", 1)
        return f"{left[:4]}...:{right[:4]}..."
    return f"{token[:4]}...{token[-4:]}"

def find_bot_index(identifier):
    for i, bot in enumerate(bots_data):
        token = bot.get("token", "")
        if identifier in (token, bot_public_id(token)):
            return i
    return None

def get_bot_for_chat(cid):
    cid_str = str(cid)
    for bot in active_bots:
        if cid_str in [str(x) for x in db.get(f"CHATS_{bot.token}", [])]:
            return bot
    return active_bots[0] if active_bots else None

def iter_known_group_targets():
    seen = set()
    for bot in active_bots:
        for cid in db.get(f"CHATS_{bot.token}", []):
            cid_str = str(cid)
            key = (getattr(bot, "token", ""), cid_str)
            if cid_str.startswith("-") and key not in seen:
                seen.add(key)
                yield bot, cid_str

def check_cas_status(uid, use_cache=True):
    """Verifica CAS y devuelve estado normalizado con cache corta."""
    uid_str = str(uid).strip()
    if not uid_str:
        return {"ok": False, "banned": False, "description": "UID vacio"}
    if uid_str.startswith("-"):
        return {"ok": True, "banned": False, "description": "CAS solo aplica a usuarios"}

    ttl = CAS_CACHE_TTL
    now = time.time()
    cached = cas_cache.get(uid_str)
    if use_cache and cached and now - cached.get("time", 0) < ttl:
        return cached["status"]

    try:
        headers = {"User-Agent": "MoonMultibot/ban-check"}
        r = requests.get(f"https://api.cas.chat/check?user_id={uid_str}", headers=headers, timeout=5)
        data = r.json() if r.content else {}
        banned = False
        if data.get("ok") is True:
            result = data.get("result", True)
            if isinstance(result, bool):
                banned = result
            elif isinstance(result, dict):
                offenses = result.get("offenses")
                banned = True if offenses is None else int(offenses or 0) > 0
            else:
                banned = bool(result)
        status = {
            "ok": r.status_code == 200,
            "banned": bool(banned),
            "description": data.get("description", ""),
            "result": data.get("result"),
            "status_code": r.status_code,
        }
    except Exception as e:
        status = {"ok": False, "banned": False, "description": str(e)}

    cas_cache[uid_str] = {"time": now, "status": status}
    return status

def is_cas_banned(uid):
    """Verifica si un usuario esta en la lista negra global de Combot Anti-Spam (CAS)."""
    return check_cas_status(uid).get("banned", False)

# --- Blueprints modulares ---
from core.routes_business import setup as _setup_business
from core.routes_proxies import setup as _setup_proxies
from core.routes_tdlib import setup as _setup_tdlib
from core.routes_security import setup as _setup_security
from core.routes_queue import setup as _setup_queue
from core.routes_moderation import setup as _setup_moderation
from core.routes_ia import setup as _setup_ia, _start_audit_logic
from core.routes_admin import setup as _setup_admin
from core.routes_system import setup as _setup_system
from core.routes_users import setup as _setup_users
from core.routes_ops import setup as _setup_ops
from core.routes_public import setup as _setup_public
from core import channel_stats
from core import image_gen
from core.pb_client import PBClient
from core.config import POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD

# Directorio de canales (hub público): almacenado en PocketBase (fuente única).
pb_channels = PBClient(POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD, log=add_web_log)
try:
    channel_stats.init(pb_channels)
except Exception as _e:
    add_web_log("ERROR", f"channel_stats/PB init: {_e}")

app.register_blueprint(_setup_business(
    check_jwt=check_jwt,
    db=db,
    get_proxy_bot=lambda: proxy_bot,
))
app.register_blueprint(_setup_proxies(
    check_jwt=check_jwt,
    db=db,
    proxy_mgr=proxy_mgr,
    add_web_log=add_web_log,
))
app.register_blueprint(_setup_tdlib(
    check_jwt=check_jwt,
    tdlib_client=tdlib_client,
))
app.register_blueprint(_setup_public(
    channel_stats=channel_stats,
    proxy_mgr=proxy_mgr,
    master_id=MASTER_ID,
    jwt_secret=JWT_SECRET,
    get_active_bots=lambda: active_bots,
    db=db,
    ban_manager=ban_manager,
    get_bot_for_chat=get_bot_for_chat,
    check_cas=check_cas_status,
    hub_bot_username=HUB_BOT_USERNAME,
))
app.register_blueprint(_setup_security(
    check_jwt=check_jwt,
    db=db,
    vt_mgr=vt_mgr,
    add_web_log=add_web_log,
    check_cas_status=check_cas_status,
))
app.register_blueprint(_setup_queue(
    check_jwt=check_jwt,
    task_queue=task_queue,
))
app.register_blueprint(_setup_moderation(
    check_jwt=check_jwt,
    db=db,
    ban_manager=ban_manager,
    add_web_log=add_web_log,
    add_audit_log=add_audit_log,
    global_user_stats=global_user_stats,
    get_bot_for_chat=get_bot_for_chat,
))
app.register_blueprint(_setup_ia(
    check_jwt=check_jwt,
    db=db,
    add_web_log=add_web_log,
    add_audit_log=add_audit_log,
    get_ia_nativa=lambda: ia_nativa,
    get_proxy_bot=lambda: proxy_bot,
    get_active_audits=lambda: active_audits,
    get_global_chat_history=lambda: global_chat_history,
    get_global_chat_names=lambda: global_chat_names,
    moon_env=MOON_ENV,
    db_path=DB_PATH,
    master_id=MASTER_ID,
    get_ollama_url=lambda: OLLAMA_URL,
    set_ollama_url=lambda value: globals().__setitem__("OLLAMA_URL", value),
    get_ia_runtime_config=lambda: {
        "USE_EXTERNAL_LLM": USE_EXTERNAL_LLM,
        "GEMINI_API_KEY": GEMINI_API_KEY,
        "HYBRID_PERCENTAGE": HYBRID_PERCENTAGE,
        "LLM_PROVIDER": LLM_PROVIDER,
        "OLLAMA_MODEL": OLLAMA_MODEL,
        "DEEP_DREAM_MODE": DEEP_DREAM_MODE,
    },
    set_ia_runtime_config=lambda cfg: globals().update({
        "USE_EXTERNAL_LLM": cfg["USE_EXTERNAL_LLM"],
        "GEMINI_API_KEY": cfg["GEMINI_API_KEY"],
        "HYBRID_PERCENTAGE": cfg["HYBRID_PERCENTAGE"],
        "LLM_PROVIDER": cfg["LLM_PROVIDER"],
        "OLLAMA_MODEL": cfg["OLLAMA_MODEL"],
        "DEEP_DREAM_MODE": cfg["DEEP_DREAM_MODE"],
    }),
))
app.register_blueprint(_setup_admin(
    check_jwt=check_jwt,
    db=db,
    add_audit_log=add_audit_log,
    get_global_chat_names=lambda: global_chat_names,
    get_proxy_bot=lambda: proxy_bot,
    get_global_user_stats=lambda: global_user_stats,
    get_global_msg_log=lambda: global_msg_log,
    get_ia_nativa=lambda: ia_nativa,
    get_maintenance_mode=lambda: maintenance_mode,
    set_maintenance_mode=lambda value: globals().__setitem__("maintenance_mode", value),
    ban_manager=ban_manager,
))
app.register_blueprint(_setup_system(
    check_jwt=check_jwt,
    get_active_bots=lambda: active_bots,
))
app.register_blueprint(_setup_users(
    check_jwt=check_jwt,
    db=db,
    ban_manager=ban_manager,
    add_audit_log=add_audit_log,
    add_web_log=add_web_log,
    get_bot_for_chat=get_bot_for_chat,
    iter_known_group_targets=iter_known_group_targets,
    get_global_media_list=lambda: global_media_list,
    get_global_user_stats=lambda: global_user_stats,
))
app.register_blueprint(_setup_ops(
    check_jwt=check_jwt,
    db=db,
    add_audit_log=add_audit_log,
))

@app.route("/")
def index(): return send_from_directory("web", "landing.html")
@app.route("/panel")
def panel(): return send_from_directory("web", "index.html")
@app.route("/<path:path>")
def static_proxy(path): return send_from_directory("web", path)

@app.route("/CHANGELOG.md")
def get_changelog(): return send_from_directory(".", "CHANGELOG.md")

@app.route("/api/login", methods=['POST'])
def web_login():
    if request.json.get("password") == WEB_PASSWORD:
        tk = jwt.encode({"exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, JWT_SECRET, algorithm="HS256")
        add_audit_log("Login Web OK")
        return jsonify({"ok": True, "token": tk})
    return jsonify({"ok": False}), 401

@app.route("/health")
def health_check():
    return jsonify({"ok": True, "uptime": int(time.time() - start_time), "bots": len(active_bots)})

@app.route("/api/admin/channels/backfill", methods=["POST"])
def api_channels_backfill():
    """BACKFILL: recorre los chats conocidos por cada bot; donde el bot ya es
    admin de un canal/grupo, lo registra y cachea su propiedad (creator/admins).
    Cubre canales donde el bot era admin desde antes (sin update capturado)."""
    if not check_jwt(request):
        return jsonify({"ok": False}), 401

    def _run():
        seen = added = 0
        for bot in list(active_bots):
            for cid in db.get(f"CHATS_{bot.token}", []) or []:
                seen += 1
                try:
                    info = bot.api_call("getChat", {"chat_id": cid})
                    r = info.get("result", {}) if info.get("ok") else {}
                    if r.get("type") not in ("channel", "supergroup"):
                        continue
                    # getChatAdministrators solo devuelve ok si el bot puede verlos (es admin)
                    adm = bot.api_call("getChatAdministrators", {"chat_id": cid})
                    if not adm.get("ok"):
                        continue
                    cnt = bot.api_call("getChatMemberCount", {"chat_id": cid})
                    members = cnt.get("result", 0) if cnt.get("ok") else 0
                    channel_stats.register_channel(
                        cid, username=r.get("username"), title=r.get("title"),
                        description=r.get("description"), ctype=r.get("type"), bot_token=bot.token,
                    )
                    if members:
                        channel_stats.record_snapshot(cid, members)
                    admins = [{"user_id": (m.get("user") or {}).get("id"), "status": m.get("status")}
                              for m in adm.get("result", [])
                              if not (m.get("user") or {}).get("is_bot") and m.get("status") in ("creator", "administrator")]
                    channel_stats.set_channel_admins(cid, admins)
                    added += 1
                except Exception as e:
                    add_web_log("ERROR", f"backfill {cid}: {e}")
        add_web_log("SUCCESS", f"Backfill canales: {added} registrados de {seen} chats vistos.")

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"ok": True, "message": "Backfill lanzado en segundo plano."})

@app.route("/api/public/analytics")
def public_analytics_settings():
    settings = db.get("GLOBAL_SETTINGS", {})
    if not isinstance(settings, dict):
        settings = {}
    return jsonify({
        "ok": True,
        "google_analytics_id": settings.get("google_analytics_id") or os.getenv("GOOGLE_ANALYTICS_ID", ""),
        "cookie_banner_enabled": settings.get("cookie_banner_enabled", "on"),
        "analytics_enabled": settings.get("analytics_enabled", "on"),
    })

@app.route("/api/status")
def web_status():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    # Obtener mÃ©tricas reales
    cpu = psutil.cpu_percent()
    if cpu == 0: cpu = psutil.cpu_percent(interval=0.1) # Forzar lectura si es 0
    mem = psutil.virtual_memory()
    ram_used = round(mem.used / (1024**3), 2)
    ram_total = round(mem.total / (1024**3), 2)
    
    return jsonify({
        "ok": True, 
        "version": APP_VERSION,
        "cpu": cpu, 
        "ram": mem.percent, 
        "ram_used": ram_used,
        "ram_total": ram_total,
        "disk": psutil.disk_usage('C:' if os.name == 'nt' else '/').percent, 
        "uptime": str(datetime.timedelta(seconds=int(time.time() - start_time))), 
        "logs": web_logs, 
        "db_vistos": len(db.get("U_FILE", {})),
        "telemetry": telemetry_history
    })

@app.route("/api/chats")
def web_chats():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    v = db.get("U_FILE", {})
    vistos_obj = []
    for k, val in v.items():
        # Si val es un dict (nuevo formato), sacamos el nombre. Si no, usamos el ID.
        name = val.get("name", k) if isinstance(val, dict) else k
        vistos_obj.append({"id": k, "name": name})
    return jsonify({"ok": True, "vistos_obj": vistos_obj})

@app.route("/api/history")
def web_history():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    cid = request.args.get("chat_id")
    if not cid: return jsonify({"ok": False, "history": []})
    
    hist = global_chat_history.get(cid)
    if not hist:
        hist = db.get(f"CHAT_HIST_{cid}", [])
        if hist:
            global_chat_history[cid] = hist  # reconstruir cachÃ©

    # Enriquecer historial con Trust Score calculado en tiempo real
    enriched_history = []
    for m in hist[-100:]:
        uid = m.get("uid")
        stats = global_user_stats.get(uid, {"karma": 0, "count": 0})
        # FÃ³rmula de Trust Score: 50 base + (karma * 2) + (msgs / 10). Cap 0-100.
        score = min(100, max(0, 50 + (stats.get("karma", 0) * 2) + (stats.get("count", 0) // 10)))
        
        m_copy = m.copy()
        m_copy["trust_score"] = score
        enriched_history.append(m_copy)
        
    return jsonify({
        "ok": True, 
        "history": enriched_history,
        "warns": db.get(f"WARNS_{cid}", {}),
        "muted_users": db.get(f"MUTED_{cid}", []),
        "banned_users": sorted(set(ban_manager.get_all_bans().get("users", [])) | set(ban_manager.get_local_bans(cid).get("users", []))),
        "global_banned_users": ban_manager.get_all_bans().get("users", []),
        "local_banned_users": ban_manager.get_local_bans(cid).get("users", [])
    })

@app.route("/api/telegram/file/<file_id>")
def web_telegram_file_proxy(file_id):
    if not check_jwt(request): return "Unauthorized", 401
    bot = active_bots[0] # Usamos el primer bot como proxy
    f_info = bot.api_call("getFile", {"file_id": file_id})
    if not f_info.get("ok"): return "File not found", 404
    
    path = f_info["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{bot.token}/{path}"
    
    try:
        r = requests.get(url, stream=True, timeout=10)
        return Response(r.iter_content(chunk_size=1024), content_type=r.headers.get('Content-Type'))
    except:
        return "Error downloading file", 500

@app.route("/api/send", methods=['POST'])
def web_send():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    d = request.json
    text = d.get("text", "")
    target = d.get("target")
    
    # 1. Enviar a Telegram
    proxy_bot.send_msg(target, text)
    
    # 2. Aprender del mensaje enviado (Dashboard tambiÃ©n enseÃ±a)
    if text:
        ia_nativa.learn(text, source="Web Dashboard")
        
    return jsonify({"ok": True})

@app.route("/api/replies", methods=['GET', 'POST', 'DELETE'])
def web_replies():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    r = db.get("S_FILE", {})
    if request.method == 'GET': return jsonify({"ok": True, "replies": r})
    if request.method == 'POST':
        d = request.json
        r[d["trigger"]] = {"text": d["response"], "image": d.get("image_url")}
        db.set("S_FILE", r); return jsonify({"ok": True})
    if request.method == 'DELETE':
        t = request.json.get("trigger")
        if t in r: del r[t]
        db.set("S_FILE", r); return jsonify({"ok": True})

@app.route("/api/plugins", methods=['GET'])
def web_plugins():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    ps = []
    if os.path.exists("plugins"):
        for f in os.listdir("plugins"):
            if f.endswith(".py"): ps.append({"name": f, "status": "Enabled"})
            elif f.endswith(".disabled"): ps.append({"name": f.replace(".disabled", ""), "status": "Disabled"})
    return jsonify({"ok": True, "plugins": ps})

@app.route("/api/plugins/toggle", methods=['POST'])
def web_plugins_toggle():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    name = request.json.get("name")
    p1, p2 = os.path.join("plugins", name), os.path.join("plugins", name + ".disabled")
    if os.path.exists(p1): os.rename(p1, p2)
    elif os.path.exists(p2): os.rename(p2, p1)
    return jsonify({"ok": True})

@app.route("/api/plugins/upload", methods=['POST'])
def web_plugins_upload():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    if 'file' not in request.files: return jsonify({"ok": False, "msg": "No file"}), 400
    f = request.files['file']
    if f.filename == '': return jsonify({"ok": False}), 400
    if f and f.filename.endswith('.py'):
        f.save(os.path.join("plugins", f.filename))
        add_audit_log(f"Plugin subido: {f.filename}")
        return jsonify({"ok": True})
    return jsonify({"ok": False, "msg": "Solo archivos .py"}), 400

@app.route("/api/plugins/reload", methods=['POST'])
def web_plugins_reload():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    add_web_log("INFO", "Recargando plugins...")
    return jsonify({"ok": True, "msg": "SeÃ±al de recarga enviada."})

@app.route("/api/system/update", methods=['GET', 'POST'])
def web_system_update():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    git_path = "git" if os.name != 'nt' else "C:\\Program Files\\Git\\bin\\git.exe"
    
    if request.method == 'GET':
        # Comprobar actualizaciones
        try:
            subprocess.run([git_path, "fetch"], timeout=15)
            res = subprocess.run([git_path, "status", "-uno"], capture_output=True, text=True)
            behind = "Your branch is behind" in res.stdout
            return jsonify({
                "ok": True, 
                "behind": behind, 
                "status": res.stdout,
                "current_commit": subprocess.check_output([git_path, "rev-parse", "--short", "HEAD"]).decode().strip()
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)})

    # Aplicar actualizaciÃ³n (POST) sin interacciÃ³n humana
    try:
        add_audit_log("ActualizaciÃ³n del sistema iniciada desde GitHub")
        outputs = []
        pull = subprocess.run([git_path, "pull", "origin", "master"], capture_output=True, text=True, timeout=120)
        outputs.append(pull.stdout or pull.stderr)
        if pull.returncode != 0:
            add_web_log("ERROR", f"FallÃ³ git pull: {pull.stderr[:300]}")
            return jsonify({"ok": False, "error": pull.stderr or pull.stdout}), 500

        docker_output = ""
        docker_cmd = None
        if os.name != 'nt':
            if subprocess.run(["sh", "-c", "command -v docker >/dev/null 2>&1"], capture_output=True).returncode == 0:
                docker_cmd = ["docker", "compose", "up", "-d", "--build", "--remove-orphans"]
        else:
            docker_cmd = ["docker", "compose", "up", "-d", "--build", "--remove-orphans"]

        if docker_cmd:
            try:
                compose = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=300)
                docker_output = (compose.stdout or "") + (compose.stderr or "")
                outputs.append(docker_output)
                if compose.returncode == 0:
                    add_web_log("SUCCESS", "Docker Compose actualizado y relanzado automÃ¡ticamente.")
                else:
                    add_web_log("WARNING", f"Docker Compose no completÃ³ la actualizaciÃ³n: {docker_output[:300]}")
            except Exception as docker_error:
                docker_output = str(docker_error)
                add_web_log("WARNING", f"No se pudo ejecutar Docker Compose automÃ¡tico: {docker_output}")

        def _restart_after_update():
            time.sleep(2)
            os.execv(sys.executable, [sys.executable] + sys.argv)
        threading.Thread(target=_restart_after_update, daemon=True).start()

        add_web_log("SUCCESS", "Sistema actualizado correctamente desde GitHub. Reinicio automÃ¡tico programado.")
        return jsonify({
            "ok": True,
            "output": "\n".join(outputs),
            "docker_output": docker_output,
            "restart": True,
            "msg": "ActualizaciÃ³n aplicada automÃ¡ticamente. Reinicio programado."
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/api/system/processes", methods=['GET'])
def web_system_processes():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    procs = []
    current_pid = os.getpid()
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'cpu_percent', 'memory_info']):
            cmd = proc.info.get('cmdline') or []
            if any("moon_multibot.py" in s for s in cmd):
                is_slave = "--slave" in str(cmd) or "slave" in str(cmd).lower()
                procs.append({
                    "pid": proc.info['pid'],
                    "is_self": proc.info['pid'] == current_pid,
                    "role": "slave" if is_slave else "master",
                    "uptime": time.time() - proc.info['create_time'],
                    "cpu": proc.info['cpu_percent'],
                    "mem": proc.info['memory_info'].rss / (1024 * 1024)
                })
        return jsonify({"ok": True, "processes": procs})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/api/system/kill", methods=['POST'])
def web_system_kill():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    target_pid = request.json.get("pid")
    if not target_pid or target_pid == os.getpid():
        return jsonify({"ok": False, "msg": "No se puede suicidar la instancia actual."})
    try:
        p = psutil.Process(target_pid)
        p.terminate()
        add_audit_log(f"Instancia zombie (PID {target_pid}) eliminada manualmente.")
        return jsonify({"ok": True, "msg": f"Proceso {target_pid} eliminado."})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/api/settings", methods=['GET', 'POST'])
def web_settings_legacy():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    if request.method == 'GET': return jsonify({"ok": True, "master_id": MASTER_ID, "welcome_msg": db.get("WELCOME_MSG", "Moon Activo."), "maintenance_mode": db.get("MAINTENANCE_MODE", False)})
    d = request.json
    if "welcome_msg" in d: db.set("WELCOME_MSG", d["welcome_msg"])
    if "maintenance_mode" in d: db.set("MAINTENANCE_MODE", d["maintenance_mode"])
    if "bot_description" in d:
        proxy_bot.api_call("setMyDescription", {"description": d["bot_description"]})
    return jsonify({"ok": True})

# rutas audit/logs/faq y users/media/bans/stats movidas a core/routes_ops.py y core/routes_users.py
global_bot_names_cache = {}

@app.route("/api/bots", methods=['GET', 'POST', 'DELETE'])
def web_bots():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    global bots_data, proxy_bot
    if request.method == 'GET':
        resolved_bots = []
        for b in bots_data:
            tk = b["token"]
            if tk not in global_bot_names_cache:
                temp_bot = MoonBot(tk)
                me = temp_bot.api_call("getMe")
                if me.get("ok"):
                    global_bot_names_cache[tk] = "@" + me["result"].get("username", "Bot")
                else:
                    global_bot_names_cache[tk] = "Token InvÃ¡lido"
            
            # Obtener chats de este bot
            bot_chats = db.get(f"CHATS_{tk}", [])
            chat_names = db.get("CHAT_NAMES", {})
            resolved_chats = [{"id": cid, "name": chat_names.get(cid, cid)} for cid in bot_chats]
            
            resolved_bots.append({
                "id": bot_public_id(tk),
                "token_preview": mask_bot_token(tk),
                "name": global_bot_names_cache[tk],
                "chats": resolved_chats
            })
        return jsonify({"ok": True, "bots": resolved_bots})
    if request.method == 'POST':
        data = request.json or {}
        token = data.get("token", "").strip()
        if not token:
            return jsonify({"ok": False, "msg": "Token requerido"}), 400
        if any(b.get("token") == token for b in bots_data):
            return jsonify({"ok": False, "msg": "Ese bot ya existe"}), 409
        bot_info = {"token": token, "enabled": True}
        bots_data.append(bot_info)
        token_manager.save_bots_to_file(bots_data, BOT_STORE_PATH, encrypt=True)
        try:
            bot_instance = MoonBot(token)
            active_bots.append(bot_instance)
            if not proxy_bot:
                proxy_bot = bot_instance
            threading.Thread(target=bot_instance.run, daemon=True).start()
            global_bot_names_cache[token] = "@" + getattr(bot_instance, "bot_username", "Bot")
            add_audit_log(f"Bot aÃ±adido: {mask_bot_token(token)}")
        except Exception as e:
            add_web_log("ERROR", f"Bot guardado, pero no pudo arrancar: {e}")
            return jsonify({"ok": True, "warning": "Bot guardado, pero no pudo arrancar en caliente."})
        return jsonify({"ok": True, "id": bot_public_id(token), "token_preview": mask_bot_token(token)})
    if request.method == 'DELETE':
        data = request.json or {}
        identifier = data.get("id") or data.get("token") or ""
        idx = find_bot_index(identifier)
        if idx is None:
            return jsonify({"ok": False, "msg": "Bot no encontrado"}), 404
        token = bots_data[idx].get("token", "")
        bots_data.pop(idx)
        token_manager.save_bots_to_file(bots_data, BOT_STORE_PATH, encrypt=True)
        active_bots[:] = [bot for bot in active_bots if getattr(bot, "token", None) != token]
        global_bot_names_cache.pop(token, None)
        add_audit_log(f"Bot eliminado: {mask_bot_token(token)}")
        return jsonify({"ok": True})
    return jsonify({"ok": True})

@app.route("/api/automation/faq", methods=['GET'])
def web_faq_list():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    faq_db = db.get("FAQ_DB", {})
    faq_answers = db.get("FAQ_ANSWERS", {})
    merged = [{"question": q, "count": c, "answer": faq_answers.get(q, "")}
              for q, c in sorted(faq_db.items(), key=lambda x: x[1], reverse=True)]
    return jsonify({"ok": True, "faq": merged})

@app.route("/api/automation/faq/set", methods=['POST'])
def web_faq_set():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    d = request.json or {}
    question = d.get("question", "").lower().strip()
    answer = d.get("answer", "").strip()
    if not question or not answer:
        return jsonify({"ok": False, "msg": "question y answer requeridos"})
    faq_answers = db.get("FAQ_ANSWERS", {})
    faq_answers[question] = answer
    db.set("FAQ_ANSWERS", faq_answers)
    add_audit_log(f"FAQ Answer guardada: '{question[:40]}'")
    return jsonify({"ok": True})

@app.route("/api/automation/faq/delete", methods=['POST'])
def web_faq_delete():
    if not check_jwt(request): return jsonify({"ok": False}), 401
    question = (request.json or {}).get("question", "").lower().strip()
    faq_answers = db.get("FAQ_ANSWERS", {})
    faq_db = db.get("FAQ_DB", {})
    faq_answers.pop(question, None)
    faq_db.pop(question, None)
    db.set("FAQ_ANSWERS", faq_answers)
    db.set("FAQ_DB", faq_db)
    return jsonify({"ok": True})

# rutas /api/ia/* movidas a core/routes_ia.py
# rutas /api/admin/* movidas a core/routes_admin.py

# (rutas de business, proxies, tdlib, security, queue â€” movidas a core/routes_*.py)

# rutas /api/telegram/call y /api/reboot movidas a core/routes_system.py

# (rutas de vision/security/moderation/leaderboard â€” movidas a core/routes_*.py)

def analyze_sentiment(text):
    if not text: return "neutral"
    text = text.lower()
    pos = ["bueno", "genial", "excelente", "gracias", "top", "preem", "cyber", "luz", "mejor", "increible", "amo", "pro"]
    neg = ["malo", "error", "fallo", "gonk", "flatline", "mierda", "basura", "lento", "peor", "odioso", "crash", "bug"]
    p_score = sum(1 for w in pos if w in text)
    n_score = sum(1 for w in neg if w in text)
    if p_score > n_score: return "positive"
    if n_score > p_score: return "negative"
    return "neutral"

def detect_intent(text):
    """Detecta la intenciÃ³n del mensaje: greeting, farewell, question, thanks, complaint, neutral."""
    if not text: return "neutral"
    t = text.lower().strip()
    greetings  = ["hola", "buenas", "hey ", "saludos", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "hi ", "hello", "ola "]
    farewells  = ["adios", "hasta luego", "chao", "bye", "nos vemos", "hasta pronto", "hasta maÃ±ana"]
    thanks     = ["gracias", "thanks", "thank you", "grax", "thx", "muchas gracias", "te lo agradezco"]
    complaints = ["error", "fallo", "no funciona", "problema", "bug", "roto", "mal", "pÃ©simo", "no sirve", "broken", "crash"]
    if any(g in t for g in greetings):  return "greeting"
    if any(f in t for f in farewells):  return "farewell"
    if any(th in t for th in thanks):   return "thanks"
    if any(c in t for c in complaints): return "complaint"
    if t.endswith("?"):                 return "question"
    return "neutral"


# ── Detección de idioma basada en langdetect ───────────────────────────────────
try:
    from langdetect import detect as _ld_detect, DetectorFactory as _LangDetectorFactory
    _LangDetectorFactory.seed = 0  # hace deterministas los resultados de langdetect
    _LANGDETECT_AVAILABLE = True
except Exception:
    _ld_detect = None
    _LANGDETECT_AVAILABLE = False


def _force_utf8(text):
    """Garantiza unicode válido pasando el texto por .encode('utf-8').decode('utf-8')."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text.encode("utf-8", "ignore").decode("utf-8", "ignore")


def detect_language_code(text):
    """Devuelve el código ISO del idioma detectado por langdetect, o '' si no se puede."""
    if not _LANGDETECT_AVAILABLE or not text:
        return ""
    cleaned = text.strip()
    if len(cleaned) < 3:
        return ""
    try:
        return _ld_detect(cleaned)
    except Exception:
        return ""


class MoonCoreIA:
    def __init__(self):
        self.brain = db.get("IA_BRAIN", {"keywords": {}, "patterns": {}})
        self.brain_lock = threading.Lock()  # Protege acceso concurrente al cerebro
        # Ensure keywords are Counter objects for stability
        self._ensure_counters()
        self.active_workers = {}
        self.business_connections = {} # Store active business accounts
        self.learning_balancer = {
            "active": False,
            "started": None,
            "workers": 0,
            "target": NEURAL_BILLION_TARGET,
            "deadline_min": NEURAL_BILLION_DEADLINE_MIN,
            "processed_sources": 0,
            "last_plan": {}
        }
        self.db_save_timer = 0
        self.start_time = time.time()
        self.mode = db.get("IA_MODE", "balanced") # eco, balanced, peak
        self.mood = db.get("IA_MOOD", "friendly") # friendly, sarcastic, philosophical, cyberpunk
        self.lang = "auto"
        self._learn_count = 0
        self.session_words = 0
        self._sources_cache = db.get("IA_SOURCES", {})
        self._activity_cache = db.get("IA_ACTIVITY", [])
        self._context_cache = {}
        # SesiÃ³n HTTP reutilizable para Ollama (keep-alive, connection pooling)
        self._ollama_session = requests.Session()
        self._ollama_session.headers.update({"Connection": "keep-alive"})
        # Circuit breaker: evita reintentar Ollama si acaba de fallar
        self._ollama_last_fail = 0.0
        self._ollama_fail_cooldown = 60  # segundos sin reintentar tras un fallo
        if len(self.brain["keywords"]) < 5000:
            threading.Thread(target=self.seed_knowledge).start()

    def _ensure_counters(self):
        """Asegura que todas las palabras clave sean objetos Counter."""
        if "keywords" not in self.brain: self.brain["keywords"] = {}
        for k, v in self.brain["keywords"].items():
            if not isinstance(v, Counter):
                if isinstance(v, (dict, list)):
                    self.brain["keywords"][k] = Counter(v)
                else:
                    self.brain["keywords"][k] = Counter()

    def seed_master_intelligence(self):
        """Inyecta conocimiento avanzado (Wikipedia y Patrones Humanos) de forma masiva."""
        add_web_log("INFO", "ðŸš€ INICIANDO MEGA-INYECTOR DE INTELIGENCIA MAESTRA...")
        if MASTER_ID:
            try:
                proxy_bot.api_call("sendMessage", {"chat_id": MASTER_ID, "text": "ðŸ§  *Iniciando proceso de ExpansiÃ³n Maestra...*\nAbsorbiendo Wikipedia y patrones humanos avanzados.", "parse_mode": "Markdown"})
            except: pass
        
        # 1. Patrones Conversacionales
        conversations = [
            "Hola, Â¿cÃ³mo estÃ¡s hoy? Yo estoy operando al cien por cien de mis capacidades neuronales.",
            "Entiendo perfectamente lo que dices, es un punto de vista muy interesante sobre el tema.",
            "Claro que sÃ­, puedo ayudarte con eso de inmediato. Â¿QuÃ© necesitas exactamente?",
            "Me parece una idea genial, deberÃ­amos profundizar mÃ¡s en ese concepto en el futuro.",
            "Vaya, no lo habÃ­a visto de esa forma. Siempre estoy aprendiendo de nuestras interacciones.",
            "Gracias por compartir eso conmigo. Mi base de datos se vuelve mÃ¡s rica con cada mensaje.",
            "Como asistente inteligente, mi prioridad es proporcionarte informaciÃ³n precisa y Ãºtil.",
            "La complejidad de este tema requiere un anÃ¡lisis detallado, pero aquÃ­ tienes un resumen.",
            "Estoy procesando la informaciÃ³n en mis nÃºcleos neuronales para darte la mejor respuesta.",
            "Es un honor servirte. Â¿Hay algo mÃ¡s en lo que pueda asistir al grupo hoy?"
        ]
        for conv in conversations:
            self.learn(conv, source="PatrÃ³n Humano")

        # 2. Wikipedia Seeding (MultilingÃ¼e Masivo)
        lang_topics = {
            "es": [
                "Inteligencia_artificial", "Universo", "Historia_de_EspaÃ±a", "TecnologÃ­a", "FilosofÃ­a", "PsicologÃ­a", 
                "FÃ­sica_cuÃ¡ntica", "BiologÃ­a", "AstronomÃ­a", "Imperio_Romano", "RevoluciÃ³n_Francesa", "Derecho",
                "Literatura_clÃ¡sica", "Cine_de_culto", "GastronomÃ­a", "MitologÃ­a", "Arquitectura_gÃ³tica", "Bitcoin",
                "Cambio_climÃ¡tico", "ExploraciÃ³n_del_espacio", "Neurociencia", "Renacimiento", "Edad_Media"
            ],
            "en": [
                "Artificial_intelligence", "Universe", "History_of_England", "Technology", "Philosophy", "Psychology", 
                "Quantum_mechanics", "Biology", "Astronomy", "Roman_Empire", "French_Revolution", "Law",
                "World_War_II", "Internet", "Software_engineering", "Robotics", "Genetics", "Evolution", "SpaceX"
            ]
        }
        
        headers = {'User-Agent': 'MoonBotMasterSeed/1.0'}
        count = 0
        for lang, topics in lang_topics.items():
            for topic in topics:
                try:
                    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{topic}"
                    r = requests.get(url, headers=headers, timeout=10)
                    if r.status_code == 200:
                        data = r.json()
                        extract = data.get("extract", "")
                        if extract:
                            self.learn(extract, source=f"Wikipedia ({lang.upper()}): {topic.replace('_', ' ')}")
                            count += 1
                    time.sleep(0.3)
                except: continue
        
        # 3. Gutenberg Seeding (LibrerÃ­a ClÃ¡sica)
        gutenberg_ids = DEFAULT_BOOK_SOURCE_IDS
        self.seed_gutenberg_books(gutenberg_ids)
        
        db.set("IA_BRAIN", self.brain) # Forzar guardado
        add_web_log("SUCCESS", f"ðŸ”¥ EXPANSIÃ“N MAESTRA COMPLETADA: {count} tÃ³picos y {len(gutenberg_ids)} libros absorbidos.")
        
        if MASTER_ID:
            self.send_master_report("ðŸš€ REPORTE DE EXPANSIÃ“N MAESTRA")
            self.send_db_to_master()

    def send_db_to_master(self):
        """EnvÃ­a una copia de la base de datos al Master."""
        if not MASTER_ID: return
        db_path = "data/moon_database.db"
        if os.path.exists(db_path):
            try:
                proxy_bot.api_call("sendDocument", {
                    "chat_id": MASTER_ID, 
                    "caption": f"ðŸ’¾ **Backup AutomÃ¡tico (Post-ExpansiÃ³n)**\nFecha: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}\nNeuronas: {len(self.brain.get('keywords', {}))}"
                }, files={"document": open(db_path, "rb")})
            except Exception as e:
                add_web_log("ERROR", f"Fallo al enviar DB al Master: {e}")

    def seed_wikipedia_topics(self, topics_list, domain="es.wikipedia.org"):
        """Inyecta conocimiento desde una lista especÃ­fica de Wikipedia o Wikisource."""
        if not topics_list: return
        source_name = "Wikipedia" if "wikipedia" in domain else "Wikisource"
        add_web_log("INFO", f"ðŸŒ Iniciando sembrado personalizado de {source_name} ({len(topics_list)} temas)...")
        
        headers = {'User-Agent': 'MoonBotMasterSeed/1.0'}
        count = 0
        for topic in topics_list:
            topic = topic.strip().replace(" ", "_")
            if not topic: continue
            try:
                url = f"https://{domain}/api/rest_v1/page/summary/{topic}"
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    extract = data.get("extract", "")
                    if extract:
                        self.learn(extract, source=f"{source_name}: {topic.replace('_', ' ')}")
                        count += 1
                time.sleep(0.5)
            except Exception as e:
                add_web_log("DEBUG", f"Error en tÃ³pico {source_name} {topic}: {e}")
        
        add_web_log("SUCCESS", f"âœ… InyecciÃ³n de {source_name} completada: {count} temas aprendidos.")
        self.send_db_to_master()

    def seed_gutenberg_books(self, book_ids, send_backup=True):
        """Inyecta libros completos desde Project Gutenberg."""
        if not book_ids: return
        add_web_log("INFO", f"ðŸ“š Iniciando descarga de {len(book_ids)} libros de Gutenberg...")
        
        count = 0
        for b_id in book_ids:
            b_id = b_id.strip()
            if not b_id: continue
            try:
                urls = [
                    f"https://www.gutenberg.org/cache/epub/{b_id}/pg{b_id}.txt",
                    f"https://www.gutenberg.org/files/{b_id}/{b_id}-0.txt",
                    f"https://www.gutenberg.org/files/{b_id}/{b_id}.txt"
                ]
                text = ""
                for url in urls:
                    r = requests.get(url, timeout=15)
                    if r.status_code == 200:
                        text = r.text
                        break
                
                if text:
                    paragraphs = text.split("\n\n")
                    for p in paragraphs[:500]:
                        if len(p.strip()) > 20:
                            self.learn(p, source=f"Gutenberg ID: {b_id}")
                    count += 1
                    add_web_log("SUCCESS", f"ðŸ“– Libro Gutenberg {b_id} absorbido.")
                time.sleep(1)
            except Exception as e:
                add_web_log("ERROR", f"Error con libro Gutenberg {b_id}: {e}")
        
        add_web_log("SUCCESS", f"âœ… Proceso Gutenberg finalizado: {count} libros integrados.")
        if send_backup:
            self.send_db_to_master()

    def seed_programming_knowledge(self, languages):
        """Inyecta conocimiento de programaciÃ³n por lenguaje y patrones prÃ¡cticos."""
        if not languages:
            languages = ["python", "javascript", "sql"]
        languages = [str(lang).strip().lower() for lang in languages if str(lang).strip()]
        if not languages:
            return

        core_topics = [
            "variables, tipos de datos, operadores, control de flujo, funciones y mÃ³dulos",
            "estructuras de datos: listas, diccionarios, conjuntos, pilas, colas, Ã¡rboles y grafos",
            "algoritmos: bÃºsqueda, ordenaciÃ³n, recursiÃ³n, programaciÃ³n dinÃ¡mica y complejidad Big O",
            "diseÃ±o limpio: nombres claros, funciones pequeÃ±as, separaciÃ³n de responsabilidades y pruebas",
            "depuraciÃ³n: leer trazas, aislar errores, crear casos mÃ­nimos y validar hipÃ³tesis",
            "seguridad: validar entradas, evitar secretos en cÃ³digo, permisos mÃ­nimos y manejo seguro de errores",
            "APIs: contratos claros, cÃ³digos de estado, paginaciÃ³n, rate limits y compatibilidad hacia atrÃ¡s",
            "bases de datos: Ã­ndices, transacciones, migraciones, normalizaciÃ³n y consultas preparadas",
            "concurrencia: hilos, procesos, async, colas de trabajo, bloqueos y condiciones de carrera",
            "DevOps: logs Ãºtiles, configuraciÃ³n por entorno, health checks, Docker y despliegues reproducibles"
        ]
        language_patterns = {
            "python": [
                "Python usa indentaciÃ³n significativa, funciones con def, clases, list comprehensions, context managers y excepciones.",
                "Ejemplo Python: def suma(a, b): return a + b. Usa pytest para pruebas y typing para contratos legibles.",
                "Python async usa async def, await, asyncio.gather y timeouts para tareas de red sin bloquear el proceso."
            ],
            "javascript": [
                "JavaScript usa let, const, funciones flecha, Promises, async/await, mÃ³dulos ES y manipulaciÃ³n del DOM.",
                "Ejemplo JavaScript: const suma = (a, b) => a + b; fetch(url).then(r => r.json()).",
                "Node.js organiza servicios con mÃ³dulos, middlewares, variables de entorno y manejo explÃ­cito de errores async."
            ],
            "typescript": [
                "TypeScript aÃ±ade tipos estÃ¡ticos, interfaces, generics, union types y narrowing sobre JavaScript.",
                "Ejemplo TypeScript: function suma(a: number, b: number): number { return a + b; }",
                "TypeScript mejora mantenibilidad cuando los tipos describen contratos de APIs, estados y eventos."
            ],
            "sql": [
                "SQL consulta datos con SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY, Ã­ndices y transacciones.",
                "Ejemplo SQL: SELECT user_id, COUNT(*) FROM messages GROUP BY user_id ORDER BY COUNT(*) DESC;",
                "Evita inyecciÃ³n SQL usando parÃ¡metros preparados y nunca concatenando entradas de usuario."
            ],
            "html": [
                "HTML estructura contenido con etiquetas semÃ¡nticas como header, main, section, article, nav y footer.",
                "Los formularios HTML deben tener labels, inputs adecuados, validaciÃ³n y atributos accesibles."
            ],
            "css": [
                "CSS controla presentaciÃ³n con cascada, especificidad, flexbox, grid, variables, media queries y estados.",
                "DiseÃ±os robustos usan constraints, gap, minmax, overflow controlado y contraste suficiente."
            ],
            "java": [
                "Java usa clases, interfaces, paquetes, tipos estÃ¡ticos, excepciones, colecciones y streams.",
                "Buenas prÃ¡cticas Java: inyecciÃ³n de dependencias, pruebas unitarias, DTOs claros y manejo explÃ­cito de null."
            ],
            "go": [
                "Go usa paquetes, structs, interfaces implÃ­citas, goroutines, channels y manejo explÃ­cito de errores.",
                "Ejemplo Go: if err != nil { return err }. La simplicidad y composiciÃ³n suelen ganar frente a jerarquÃ­as complejas."
            ],
            "rust": [
                "Rust usa ownership, borrowing, lifetimes, traits, enums Result/Option y seguridad de memoria sin GC.",
                "Rust expresa errores con Result<T, E> y evita data races mediante reglas de prÃ©stamo en compilaciÃ³n."
            ],
            "php": [
                "PHP moderno usa namespaces, Composer, tipos, PDO, frameworks MVC y separaciÃ³n entre lÃ³gica y vistas.",
                "En PHP usa consultas preparadas, sanitizaciÃ³n de salida y configuraciÃ³n fuera del repositorio."
            ],
            "bash": [
                "Bash automatiza tareas con pipes, variables, funciones, cÃ³digos de salida y set -euo pipefail cuando conviene.",
                "Scripts shell robustos validan argumentos, citan variables y evitan borrar rutas no verificadas."
            ],
        }

        count = 0
        for topic in core_topics:
            self.learn(topic, source="Programming Core")
            count += 1
        for lang in languages:
            patterns = language_patterns.get(lang, [
                f"{lang} requiere entender sintaxis, tipos, control de flujo, funciones, mÃ³dulos, pruebas y depuraciÃ³n.",
                f"Para programar bien en {lang}, escribe cÃ³digo legible, prueba casos lÃ­mite y documenta contratos importantes."
            ])
            self.learn(f"Lenguaje {lang}: fundamentos, sintaxis, patrones, testing, debugging, seguridad y rendimiento.", source=f"Programming {lang}")
            count += 1
            for pattern in patterns:
                self.learn(pattern, source=f"Programming {lang}")
                count += 1
        db.set("IA_BRAIN", self.brain)
        add_web_log("SUCCESS", f"ðŸ’» Conocimiento de programaciÃ³n inyectado ({count} bloques, {len(languages)} lenguajes).")
        self.send_db_to_master()

    def get_default_book_sources(self, multiplier=1):
        multiplier = max(1, min(int(multiplier or 1), 50))
        return (DEFAULT_BOOK_SOURCE_IDS * multiplier)[:len(DEFAULT_BOOK_SOURCE_IDS) * multiplier]

    def learning_source_worker(self, worker_id, book_ids):
        processed = 0
        try:
            add_web_log("IA", f"âš–ï¸ Worker neural #{worker_id} iniciado con {len(book_ids)} fuentes.")
            for b_id in book_ids:
                if not self.learning_balancer.get("active"):
                    break
                self.seed_gutenberg_books([b_id], send_backup=False)
                processed += 1
                self.learning_balancer["processed_sources"] += 1
                time.sleep(0.2)
        except Exception as e:
            add_web_log("ERROR", f"Worker neural #{worker_id} fallÃ³: {e}")
        finally:
            self.active_workers.pop(f"learn_{worker_id}", None)
            add_web_log("IA", f"âš–ï¸ Worker neural #{worker_id} finalizado ({processed} fuentes).")
            if not any(k.startswith("learn_") for k in self.active_workers):
                self.learning_balancer["active"] = False
                db.set("IA_BRAIN", self.brain)
                self.send_db_to_master()

    def start_learning_balancer(self, max_workers=None, source_multiplier=3):
        if self.learning_balancer.get("active"):
            return {"ok": False, "msg": "El balanceador ya estÃ¡ activo", "state": self.learning_balancer}

        stats = self.get_stats()
        plan = stats.get("load_balancer", {}).get("last_plan", {})
        cfg = db.get("IA_LOAD_BALANCER", {})
        configured_max = int(cfg.get("max_workers", 8))
        worker_count = int(max_workers or plan.get("planned_workers") or configured_max)
        worker_count = max(1, min(worker_count, configured_max, 32))
        sources = self.get_default_book_sources(source_multiplier)
        if not sources:
            return {"ok": False, "msg": "No hay fuentes disponibles"}

        chunks = [sources[i::worker_count] for i in range(worker_count)]
        self.learning_balancer.update({
            "active": True,
            "started": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "workers": worker_count,
            "target": NEURAL_BILLION_TARGET,
            "deadline_min": NEURAL_BILLION_DEADLINE_MIN,
            "processed_sources": 0,
            "last_plan": plan
        })
        for idx, chunk in enumerate(chunks, start=1):
            t = threading.Thread(target=self.learning_source_worker, args=(idx, chunk), daemon=True)
            self.active_workers[f"learn_{idx}"] = t
            t.start()
        return {"ok": True, "msg": f"Balanceador iniciado con {worker_count} workers y {len(sources)} fuentes", "state": self.learning_balancer}

    def stop_learning_balancer(self):
        self.learning_balancer["active"] = False
        return {"ok": True, "msg": "Balanceador detenido", "state": self.learning_balancer}

    def remember_context(self, chat_id, text, role="user"):
        """Mantiene el contexto reciente de un chat para la generaciÃ³n de IA."""
        if chat_id not in global_chat_history:
            global_chat_history[chat_id] = []
        global_chat_history[chat_id].append({
            "role": role,
            "text": text,
            "time": datetime.datetime.now().strftime("%H:%M")
        })
        # Mantener solo los Ãºltimos 15 mensajes de contexto
        if len(global_chat_history[chat_id]) > 15:
            global_chat_history[chat_id].pop(0)

    def deep_dream_worker(self):
        """Hilo de auto-estudio autÃ³nomo cuando el bot estÃ¡ ocioso"""
        add_web_log("IA", "Iniciando motor de SueÃ±o Profundo (Auto-Estudio)...")
        while True:
            _dd_backoff = random.randint(60, 120)
            keywords = self.brain.get("keywords", {})
            word = None
            if keywords:
                word = random.choice([w for w in keywords if len(w) > 3] or list(keywords.keys()))

            if DEEP_DREAM_MODE and word:
                if LLM_PROVIDER == "ollama" and (time.time() - self._ollama_last_fail >= self._ollama_fail_cooldown):
                    try:
                        prompt = f"Dime algo breve pero muy interesante y educativo sobre: {word}. Responde en espaÃ±ol."
                        payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
                        r = self._ollama_session.post(OLLAMA_URL, json=payload, timeout=(3, 45))
                        if r.status_code == 200:
                            knowledge = r.json().get("response", "")
                            if knowledge:
                                self.learn(knowledge, source="Deep Dream (Ollama)")
                                add_web_log("IA", f"ðŸŒ™ SueÃ±o Profundo Ollama: Aprendido sobre '{word}'")
                            _dd_backoff = random.randint(60, 120)
                        else:
                            self._ollama_last_fail = time.time()
                            self._deep_dream_wikipedia(word)
                            _dd_backoff = 120
                    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                        self._ollama_last_fail = time.time()
                        add_web_log("WARNING", f"Deep Dream: Ollama no disponible â€” usando Wikipedia, cooldown {self._ollama_fail_cooldown}s")
                        self._deep_dream_wikipedia(word)
                        _dd_backoff = 180
                    except Exception as e:
                        self._ollama_last_fail = time.time()
                        add_web_log("ERROR", f"Deep Dream: Error inesperado: {e}")
                        _dd_backoff = 120
                else:
                    # Ollama en cooldown o no configurado â€” usar Wikipedia
                    self._deep_dream_wikipedia(word)

            time.sleep(_dd_backoff)

    def _deep_dream_wikipedia(self, word):
        """Aprende sobre una palabra buscÃ¡ndola en Wikipedia."""
        try:
            r = requests.get(
                f"https://es.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(word)}",
                timeout=8
            )
            if r.status_code == 200:
                extract = r.json().get("extract", "")
                if len(extract) > 50:
                    self.learn(extract, source="Deep Dream (Wikipedia)")
                    add_web_log("IA", f"ðŸŒ™ SueÃ±o Profundo Wikipedia: Aprendido sobre '{word}'")
                    return
            # Fallback inglÃ©s
            r2 = requests.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(word)}",
                timeout=8
            )
            if r2.status_code == 200:
                extract = r2.json().get("extract", "")
                if len(extract) > 50:
                    self.learn(extract, source="Deep Dream (Wikipedia EN)")
                    add_web_log("IA", f"ðŸŒ™ SueÃ±o Profundo Wikipedia EN: Aprendido sobre '{word}'")
        except Exception:
            pass

    def _seed_from_wikipedia(self, topics, lang="es", max_topics=30):
        """Busca resÃºmenes de Wikipedia para los topics dados y aprende oraciones completas."""
        seeded = 0
        for topic in topics[:max_topics]:
            try:
                r = requests.get(
                    f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(str(topic))}",
                    timeout=6
                )
                if r.status_code == 200:
                    extract = r.json().get("extract", "")
                    if len(extract) > 50:
                        self.learn(extract, source=f"Wikipedia_{lang}")
                        seeded += 1
                        continue
                if lang != "en":
                    r2 = requests.get(
                        f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(str(topic))}",
                        timeout=6
                    )
                    if r2.status_code == 200:
                        extract = r2.json().get("extract", "")
                        if len(extract) > 50:
                            self.learn(extract, source="Wikipedia_en")
                            seeded += 1
            except Exception:
                pass
        return seeded

    def seed_knowledge(self):
        global multilingual_seeds
        add_web_log("INFO", "ðŸŒ± Iniciando sembrado de conocimiento masivo...")
        try:
            # 1. Semillas MultilingÃ¼es
            if os.path.exists("data/multilingual_seeds.json"):
                with open("data/multilingual_seeds.json", "r", encoding="utf-8") as f:
                    multilingual_seeds = json.load(f)
                for lang, phrases in multilingual_seeds.items():
                    for phrase in phrases:
                        self.learn(phrase, source=f"Seed_{lang}")
                add_web_log("SUCCESS", f"ðŸ§  Conocimiento multilingÃ¼e sembrado ({len(multilingual_seeds)} idiomas).")

            # 2. Conocimiento Inicial â€” enriquecido con Wikipedia (los topics son palabras sueltas)
            if os.path.exists("data/initial_knowledge.json"):
                with open("data/initial_knowledge.json", "r", encoding="utf-8") as f:
                    initial = json.load(f)
                add_web_log("INFO", f"ðŸ“š Enriqueciendo {len(initial)} topics con Wikipedia...")
                seeded = self._seed_from_wikipedia(initial, lang="es", max_topics=40)
                add_web_log("SUCCESS", f"ðŸ“š Wikipedia sembrada: {seeded}/{min(40, len(initial))} topics con oraciones reales.")

        except Exception as e:
            add_web_log("ERROR", f"âŒ Error en seed_knowledge: {e}")

    def detect_lang(self, text):
        # 1. DetecciÃ³n por rango Unicode (instantÃ¡nea, sin falsos positivos)
        for ch in text:
            cp = ord(ch)
            if 0x0600 <= cp <= 0x06FF: return "ar"   # Ãrabe
            if 0x0900 <= cp <= 0x097F: return "hi"   # Devanagari (Hindi)
            if 0x0980 <= cp <= 0x09FF: return "bn"   # BengalÃ­/AsamÃ©s
            if 0x0A00 <= cp <= 0x0A7F: return "pa"   # Gurmukhi/PunyabÃ­
            if 0x0A80 <= cp <= 0x0AFF: return "gu"   # Gujarati
            if 0x0B80 <= cp <= 0x0BFF: return "ta"   # Tamil
            if 0x0C00 <= cp <= 0x0C7F: return "te"   # Telugu
            if 0x0C80 <= cp <= 0x0CFF: return "kn"   # Kannada
            if 0x0D00 <= cp <= 0x0D7F: return "ml"   # Malayalam
            if 0x0D80 <= cp <= 0x0DFF: return "si"   # Sinhala
            if 0x0400 <= cp <= 0x04FF: return "ru"   # CirÃ­lico (Ruso/Ucraniano)
            if 0x0370 <= cp <= 0x03FF: return "el"   # Griego
            if 0x0530 <= cp <= 0x058F: return "hy"   # Armenio
            if 0x10A0 <= cp <= 0x10FF: return "ka"   # Georgiano
            if 0x1200 <= cp <= 0x137F: return "am"   # EtÃ­ope/AmhÃ¡rico
            if 0x4E00 <= cp <= 0x9FFF: return "zh"   # CJK (Chino)
            if 0x3040 <= cp <= 0x30FF: return "ja"   # Hiragana/Katakana (JaponÃ©s)
            if 0xAC00 <= cp <= 0xD7A3: return "ko"   # Hangul (Coreano)
            if 0x0E00 <= cp <= 0x0E7F: return "th"   # TailandÃ©s
            if 0x0590 <= cp <= 0x05FF: return "he"   # Hebreo
            if 0x1000 <= cp <= 0x109F: return "my"   # Birmano
            if 0x1780 <= cp <= 0x17FF: return "km"   # Jemer
            if 0x0E80 <= cp <= 0x0EFF: return "lo"   # Lao
            if 0x0F00 <= cp <= 0x0FFF: return "bo"   # Tibetano

        # 2. Palabras clave para idiomas de escritura latina y otros
        kw_map = {
            "tr": ["merhaba", "teÅŸekkÃ¼r", "gÃ¼naydÄ±n", "nasÄ±lsÄ±n", "lÃ¼tfen", "iyi", "ederim"],
            "de": ["hallo", "danke", "bitte", "guten", "morgen", "tschÃ¼ss", "wie", "geht"],
            "fr": ["bonjour", "merci", "bonsoir", "salut", "bonne", "journÃ©e", "vous", "moi"],
            "it": ["ciao", "grazie", "buongiorno", "prego", "arrivederci", "come", "stai"],
            "pt": ["olÃ¡", "obrigado", "bom", "vocÃª", "tchau", "muito", "prazer", "boa"],
            "en": ["hello", "thanks", "please", "sorry", "good", "morning", "evening", "night"],
            "es": ["hola", "gracias", "buenos", "buenas", "favor", "disculpa", "quÃ©", "cÃ³mo"],
            "nl": ["hallo", "dank", "goedemorgen", "goedemiddag", "goedemavond", "alsjeblieft", "hoe", "gaat"],
            "sv": ["hej", "tack", "godmorgon", "godkvÃ¤ll", "ursÃ¤kta", "snÃ¤lla", "hur", "mÃ¥r"],
            "pl": ["czeÅ›Ä‡", "dziÄ™kujÄ™", "dzieÅ„ dobry", "dobry wieczÃ³r", "proszÄ™", "przepraszam", "jak", "siÄ™ masz"],
            "cs": ["ahoj", "dÄ›kuji", "dobrÃ© rÃ¡no", "dobrÃ½ veÄer", "prosÃ­m", "omlouvÃ¡m", "jak", "se mÃ¡Å¡"],
            "hu": ["szia", "kÃ¶szÃ¶nÃ¶m", "jÃ³ reggelt", "jÃ³ estÃ©t", "kÃ©rem", "bocsÃ¡nat", "hogy", "vagy"],
            "ro": ["salut", "mulÈ›umesc", "bunÄƒ dimineaÈ›a", "bunÄƒ seara", "te rog", "scuze", "cum", "eÈ™ti"],
            "uk": ["Ð¿Ñ€Ð¸Ð²Ñ–Ñ‚", "Ð´ÑÐºÑƒÑŽ", "Ð´Ð¾Ð±Ñ€Ð¾Ð³Ð¾ Ñ€Ð°Ð½ÐºÑƒ", "Ð´Ð¾Ð±Ñ€Ð¾Ð³Ð¾ Ð²ÐµÑ‡Ð¾Ñ€Ð°", "Ð±ÑƒÐ´ÑŒ Ð»Ð°ÑÐºÐ°", "Ð²Ð¸Ð±Ð°Ñ‡", "ÑÐº", "ÑÐ¿Ñ€Ð°Ð²Ð¸"],
            "he": ["×©×œ×•×", "×ª×•×“×”", "×‘×•×§×¨ ×˜×•×‘", "×¢×¨×‘ ×˜×•×‘", "×‘×‘×§×©×”", "×¡×œ×™×—×”", "××™×š", "××ª×”"],
            "da": ["hej", "tak", "godmorgen", "godaften", "undskyld", "tak", "hvordan", "har"],
            "no": ["hei", "takk", "god morgen", "god kveld", "unnskyld", "vÃ¦r sÃ¥ snill", "hvordan", "gÃ¥r"],
            "fi": ["hei", "kiitos", "hyvÃ¤Ã¤ huomenta", "hyvÃ¤Ã¤ iltaa", "anteeksi", "ole hyvÃ¤", "miten", "voi"],
            "et": ["tere", "aitÃ¤h", "tere hommikust", "head Ãµhtut", "vabandust", "palun", "kuidas", "lÃ¤heb"],
            "lv": ["sveiki", "paldies", "labrÄ«t", "labvakar", "atvainojiet", "lÅ«dzu", "kÄ", "iet"],
            "lt": ["labas", "aÄiÅ«", "labas rytas", "labas vakaras", "atsipraÅ¡au", "praÅ¡au", "kaip", "sekasi"],
            "sk": ["ahoj", "Äakujem", "dobrÃ© rÃ¡no", "dobrÃ½ veÄer", "prepÃ¡Äte", "prosÃ­m", "ako", "sa mÃ¡Å¡"],
            "sl": ["zdravo", "hvala", "dobro jutro", "dober veÄer", "oprostite", "prosim", "kako", "ste"],
            "hr": ["zdravo", "hvala", "dobro jutro", "dobra veÄer", "oprostite", "molim", "kako", "ste"],
            "bs": ["zdravo", "hvala", "dobro jutro", "dobra veÄer", "oprosti", "molim", "kako", "si"],
            "sr": ["zdravo", "hvala", "dobro jutro", "dobro veÄe", "izvini", "molim", "kako", "si"],
            "mk": ["Ð·Ð´Ñ€Ð°Ð²Ð¾", "Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ð°Ð¼", "Ð´Ð¾Ð±Ñ€Ð¾ ÑƒÑ‚Ñ€Ð¾", "Ð´Ð¾Ð±Ñ€Ð° Ð²ÐµÑ‡ÐµÑ€", "Ð¸Ð·Ð²Ð¸Ð½Ð¸", "Ð¼Ð¾Ð»Ð°Ð¼", "ÐºÐ°ÐºÐ¾", "ÑÐ¸"],
            "bg": ["Ð·Ð´Ñ€Ð°Ð²ÐµÐ¹", "Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ñ", "Ð´Ð¾Ð±Ñ€Ð¾ ÑƒÑ‚Ñ€Ð¾", "Ð´Ð¾Ð±ÑŠÑ€ Ð²ÐµÑ‡ÐµÑ€", "Ð¸Ð·Ð²Ð¸Ð½ÑÐ²Ð°Ð¹", "Ð¼Ð¾Ð»Ñ", "ÐºÐ°Ðº", "ÑÐ¸"],
            "sq": ["pÃ«rshÃ«ndetje", "faleminderit", "mirÃ«mÃ«ngjes", "mirÃ«mbrÃ«ma", "mÃ« fal", "ju lutem", "si", "jeni"],
            "mt": ["Ä§ello", "grazzi", "bonÄ¡u", "bonswa", "skuÅ¼ani", "jekk jogÄ§Ä¡bok", "kif", "int"],
            "is": ["hallÃ³", "takk", "gÃ³Ã°an daginn", "gÃ³Ã°a kvÃ¶ldiÃ°", "afsakiÃ°", "vinsamlegast", "hvernig", "gengur"],
            "ga": ["dia duit", "go raibh maith agat", "maidin mhaith", "oÃ­che mhaith", "gabhaim leithscÃ©al", "le do thoil", "conas", "tÃ¡"],
            "cy": ["helo", "diolch", "bore da", "nos da", "ymddiheuriadau", "os gwelwch yn dda", "sut", "mae"],
            "gd": ["halÃ²", "tapadh leat", "madainn mhath", "oidhche mhath", "duilich", "mas e do thoil e", "ciamar", "a tha"],
            "eu": ["kaixo", "eskerrik asko", "egun on", "arratsalde on", "barkatu", "mesedez", "nola", "zaude"],
            "ca": ["hola", "grÃ cies", "bon dia", "bona nit", "perdÃ³", "si us plau", "com", "estÃ s"],
            "gl": ["ola", "grazas", "bos dÃ­as", "boas noites", "perdÃ³n", "por favor", "como", "estÃ¡s"],
            "oc": ["bonjorn", "mercÃ©s", "bon jorn", "bona nuÃ¨ch", "perdonatz", "per favor", "coma", "anatz"],
            "br": ["demat", "trugarez", "matin mad", "nozvezh mad", "digarez", "mar plij", "pegoulz", "emaout"],
            "fy": ["hallo", "tank", "goeiemoarn", "goeienjÃ»n", "ekskusearje", "asjebleaft", "hoe", "giet"],
            "lb": ["hallo", "merci", "gudde moien", "gudden owend", "entschÃ«llegt", "wann ech gelift", "wÃ©i", "geet"],
            "wa": ["bondjoÃ»", "grÃ¥ce", "boun di djouwene", "boun nÃ»t", "dmandÃ¨ escuzes", "s'i vs plait", "comint", "alez"],
            "sc": ["salude", "grÃ tzias", "bonas dies", "bonas nottes", "perdonu", "per piascere", "comente", "ses"],
            "co": ["bonjournu", "grazii", "bon ghjornu", "bona sera", "scusate", "per piacÃ¨", "cum'Ã¨", "site"],
            "rm": ["allegra", "grazia", "bun di", "buna saira", "perdunai", "per plaschair", "co", "va"],
            "bn": ["à¦†à¦®à¦¿", "à¦¤à§à¦®à¦¿", "à¦†à¦®à¦°à¦¾", "à¦¤à¦¾à¦°à¦¾", "à¦à¦Ÿà¦¾", "à¦“à¦Ÿà¦¾", "à¦•à¦¿", "à¦•à§‹à¦¥à¦¾à¦¯à¦¼", "à¦•à¦–à¦¨", "à¦•à§‡à¦¨", "à¦•à§€à¦­à¦¾à¦¬à§‡", "à¦­à¦¾à¦¤", "à¦šà¦¾", "à¦–à¦¾à¦‡", "à¦ªà¦¾à¦¨", "à¦¯à¦¾à¦‡", "à¦†à¦¸à¦¿", "à¦¦à§‡à¦–à¦¿", "à¦¶à§à¦¨à¦¿"],
            "vi": ["tÃ´i", "báº¡n", "chÃºng tÃ´i", "há»", "cÃ¡i nÃ y", "cÃ¡i kia", "gÃ¬", "á»Ÿ Ä‘Ã¢u", "khi nÃ o", "táº¡i sao", "nhÆ° tháº¿ nÃ o", "cÆ¡m", "trÃ ", "Äƒn", "uá»‘ng", "Ä‘i", "Ä‘áº¿n", "nhÃ¬n", "nghe"],
            "ta": ["à®¨à®¾à®©à¯", "à®¨à¯€", "à®¨à®¾à®™à¯à®•à®³à¯", "à®…à®µà®°à¯à®•à®³à¯", "à®‡à®¤à¯", "à®…à®¤à¯", "à®Žà®©à¯à®©", "à®Žà®™à¯à®•à¯‡", "à®Žà®ªà¯à®ªà¯‹à®¤à¯", "à®à®©à¯", "à®Žà®ªà¯à®ªà®Ÿà®¿", "à®šà¯‹à®±à¯", "à®¤à¯‡à®¨à¯€à®°à¯", "à®šà®¾à®ªà¯à®ªà®¿à®Ÿà¯", "à®•à¯à®Ÿà®¿", "à®ªà¯‹", "à®µà®¾", "à®ªà®¾à®°à¯", "à®•à¯‡à®³à¯"],
            "te": ["à°¨à±‡à°¨à±", "à°¨à±à°µà±à°µà±", "à°®à±‡à°®à±", "à°µà°¾à°°à±", "à°‡à°¦à°¿", "à°…à°¦à°¿", "à°à°®à°¿à°Ÿà°¿", "à°Žà°•à±à°•à°¡", "à°Žà°ªà±à°ªà±à°¡à±", "à°Žà°‚à°¦à±à°•à±", "à°Žà°²à°¾", "à°µà°°à°¿à°—à°¾", "à°Ÿà±€", "à°¤à°¿à°¨à±", "à°¤à±à°°à°¾à°—à±", "à°µà±†à°³à±à°³à±", "à°°à°¾", "à°šà±‚à°¡à±", "à°µà°¿à°¨à±"],
            "mr": ["à¤®à¥€", "à¤¤à¥‚", "à¤†à¤®à¥à¤¹à¥€", "à¤¤à¥‡", "à¤¹à¥‡", "à¤¤à¥‡", "à¤•à¤¾à¤¯", "à¤•à¥à¤ à¥‡", "à¤•à¤§à¥€", "à¤•à¤¾", "à¤•à¤¸à¥‡", "à¤­à¤¾à¤¤", "à¤šà¤¹à¤¾", "à¤–à¤¾", "à¤ªà¤¿à¤Šà¤¨", "à¤œà¤¾", "à¤¯à¥‡", "à¤ªà¤¾à¤¹à¤¾", "à¤à¤•à¤¾"],
            "ur": ["Ù…ÛŒÚº", "ØªÙˆ", "ÛÙ…", "ÙˆÛ", "ÛŒÛ", "ÙˆÛ", "Ú©ÛŒØ§", "Ú©ÛØ§Úº", "Ú©Ø¨", "Ú©ÛŒÙˆÚº", "Ú©ÛŒØ³Û’", "Ú†Ø§ÙˆÙ„", "Ú†Ø§Ø¦Û’", "Ú©Ú¾Ø§Ø¤", "Ù¾ÛŒÙˆ", "Ø¬Ø§Ø¤", "Ø¢Ø¤", "Ø¯ÛŒÚ©Ú¾Ùˆ", "Ø³Ù†Ùˆ"],
            "gu": ["àª¹à«àª‚", "àª¤à«àª‚", "àª…àª®à«‡", "àª¤à«‡àª“", "àª†", "àª¤à«‡", "àª¶à«àª‚", "àª•à«àª¯àª¾àª‚", "àª•à«àª¯àª¾àª°à«‡", "àª•à«‡àª®", "àª•à«‡àªµà«€ àª°à«€àª¤à«‡", "àª­àª¾àª¤", "àªšàª¾", "àª–àª¾àªµà«àª‚", "àªªà«€àªµà«àª‚", "àªœàªµà«àª‚", "àª†àªµàªµà«àª‚", "àªœà«‹àªµà«àª‚", "àª¸àª¾àª‚àª­àª³àªµà«àª‚"],
            "id": ["saya", "kamu", "kami", "mereka", "ini", "itu", "apa", "di mana", "kapan", "mengapa", "bagaimana", "nasi", "teh", "makan", "minum", "pergi", "datang", "lihat", "dengar"],
            "fa": ["Ù…Ù†", "ØªÙˆ", "Ù…Ø§", "Ø¢Ù†Ù‡Ø§", "Ø§ÛŒÙ†", "Ø¢Ù†", "Ú†ÛŒØ³Øª", "Ú©Ø¬Ø§", "Ú©ÛŒ", "Ú†Ø±Ø§", "Ú†Ú¯ÙˆÙ†Ù‡", "Ø¨Ø±Ù†Ø¬", "Ú†Ø§ÛŒ", "Ø®ÙˆØ±", "Ù†ÙˆØ´", "Ø¨Ø±Ùˆ", "Ø¨ÛŒØ§", "Ø¨Ø¨ÛŒÙ†", "Ø¨Ø´Ù†Ùˆ"],
            "ms": ["saya", "awak", "kami", "mereka", "ini", "itu", "apa", "di mana", "bila", "mengapa", "bagaimana", "nasi", "teh", "makan", "minum", "pergi", "datang", "lihat", "dengar"],
            "pa": ["à¨®à©ˆà¨‚", "à¨¤à©‚à©°", "à¨…à¨¸à©€à¨‚", "à¨‰à¨¹", "à¨‡à¨¹", "à¨‰à¨¹", "à¨•à©€", "à¨•à¨¿à©±à¨¥à©‡", "à¨•à¨¦à©‹à¨‚", "à¨•à¨¿à¨‰à¨‚", "à¨•à¨¿à¨µà©‡à¨‚", "à¨šà¨¾à¨µà¨²", "à¨šà¨¾à¨¹", "à¨–à¨¾à¨£à¨¾", "à¨ªà©€à¨£à¨¾", "à¨œà¨¾à¨£à¨¾", "à¨†à¨‰à¨£à¨¾", "à¨¦à©‡à¨–à¨£à¨¾", "à¨¸à©à¨£à¨¨à¨¾"],
            "kn": ["à²¨à²¾à²¨à³", "à²¨à³€à²¨à³", "à²¨à²¾à²µà³", "à²…à²µà²°à³", "à²‡à²¦à³", "à²…à²¦à³", "à²à²¨à³", "à²Žà²²à³à²²à²¿", "à²Žà²‚à²¦à³", "à²à²•à³†", "à²¹à³‡à²—à³†", "à²…à²¨à³à²¨", "à²šà²¹à²¾", "à²¤à²¿à²¨à³à²¨à³", "à²•à³à²¡à²¿", "à²¹à³‹à²—à³", "à²¬à²¾", "à²¨à³‹à²¡à³", "à²•à³‡à²³à³"],
            "or": ["à¬®à­à¬", "à¬¤à­à¬", "à¬†à¬®à­‡", "à¬¸à­‡à¬®à¬¾à¬¨à­‡", "à¬à¬¹à¬¾", "à¬¸à­‡à¬¹à¬¾", "à¬•à¬£", "à¬•à­‡à¬‰à¬à¬ à¬¾à¬°à­‡", "à¬•à­‡à¬¤à­‡à¬¬à­‡à¬³à­‡", "à¬•à¬¾à¬¹à¬¿à¬à¬•à¬¿", "à¬•à­‡à¬®à¬¿à¬¤à¬¿", "à¬­à¬¾à¬¤", "à¬šà¬¾", "à¬–à¬¾à¬…", "à¬ªà¬¿à¬…", "à¬¯à¬¾à¬…", "à¬†à¬¸", "à¬¦à­‡à¬–", "à¬¶à­à¬£"],
            "ml": ["à´žà´¾àµ»", "à´¨àµ€", "à´¨à´¾à´‚", "à´…à´µàµ¼", "à´‡à´¤àµ", "à´…à´¤àµ", "à´Žà´¨àµà´¤àµ", "à´Žà´µà´¿à´Ÿàµ†", "à´Žà´ªàµà´ªàµ‹àµ¾", "à´Žà´¨àµà´¤àµà´•àµŠà´£àµà´Ÿàµ", "à´Žà´™àµà´™à´¨àµ†", "à´…à´¨àµà´¨à´‚", "à´šà´¾à´¯", "à´•à´´à´¿à´•àµà´•àµà´•", "à´•àµà´Ÿà´¿à´•àµà´•àµà´•", "à´ªàµ‹à´•àµà´•", "à´µà´°à´¿à´•", "à´•à´¾à´£àµà´•", "à´•àµ‡àµ¾à´•àµà´•àµà´•"],
            "su": ["abdi", "anjeun", "urang", "aranjeunna", "ieu", "Ã©ta", "naon", "dimana", "iraaha", "naha", "kumaha", "sangu", "tea", "tuang", "nginum", "indit", "datang", "ningali", "ngadangu"],
            "ha": ["ni", "kai", "mu", "su", "wannan", "wancan", "me", "ina", "yaushe", "me yasa", "yaya", "shinkafa", "shayi", "ci", "sha", "je", "zo", "gani", "ji"],
            "yo": ["mo", "o", "a", "won", "eyi", "iyen", "kini", "ibo", "igbawo", "kilode", "bawo", "irin", "táº¹", "jáº¹", "mu", "lá»", "wÃ¡", "rÃ­", "gbá»"],
            "ig": ["m", "á»‹", "anyá»‹", "ha", "nke a", "nke ahá»¥", "gá»‹ná»‹", "ebee", "mgbe", "gá»‹ná»‹ mere", "kedu", "nri", "tÃ­Ã¬", "rie", "á¹…á»¥á»", "gaa", "abá»‹a", "há»¥", "ná»¥"],
            "zu": ["ngi", "u", "si", "ba", "lokhu", "lokho", "yini", "kuphi", "nini", "ngoba", "kanjani", "ukudla", "itiye", "dla", "phuza", "hamba", "za", "bona", "zwu"],
            "am": ["áŠ¥áŠ”", "áŠ áŠ•á‰°", "áŠ¥áŠ›", "áŠ¥áŠáˆ±", "á‹­áˆ…", "á‹«", "áˆáŠ•", "á‹¨á‰µ", "áˆ˜á‰¼", "áˆˆáˆáŠ•", "áŠ¥áŠ•á‹´á‰µ", "áˆáŒá‰¥", "áˆ»á‹­", "áˆˆáˆ", "áˆ°á‰²", "áˆ„á‹³áˆˆáˆ", "áˆ°áˆ›áˆˆáˆ", "áŠ áˆˆáˆ", "áˆ°áˆ›áˆˆáˆ"],
            "qu": ["Ã±uqa", "qam", "Ã±uqanchik", "paykuna", "kay", "chay", "ima", "maypi", "hayk'aq", "imanasqa", "imaynatas", "mikhuna", "upyana", "mikhuni", "upyanichani", "rini", "hamuni", "rikuni", "uyarini"],
            "ay": ["naya", "juma", "nayanakaxa", "jumanakaxa", "aki", "uka", "kuna", "khaya", "kunjamsa", "kawkisa", "kunjamsa", "manq'a", "chaya", "manqthwa", "chayatha", "sartha", "juttha", "uÃ±tha", "ist'a"],
            "gn": ["che", "nde", "Ã±ande", "ha'e", "ko", "pe", "mba'e", "moÃµ", "araka'eve", "mba'e", "mba'eicha", "ka'arÃµ", "ka'ay", "karu", "'u", "ho", "ju", "hecha", "hendu"],
            "ht": ["mwen", "ou", "nou", "yo", "sa a", "sa", "ki", "ki kote", "kilÃ¨", "poukisa", "ki jan", "diri", "te", "manje", "bwÃ¨", "ale", "vini", "wÃ¨", "tande"],
            "mn": ["Ð±Ð¸", "Ñ‡Ð¸", "Ð±Ð¸Ð´", "Ñ‚ÑÐ´", "ÑÐ½Ñ", "Ñ‚ÑÑ€", "ÑŽÑƒ", "Ñ…Ð°Ð°Ð½Ð°", "Ñ…ÑÐ·ÑÑ", "ÑÐ°Ð³Ð°Ð°Ð´", "Ñ…ÑÑ€Ñ…ÑÐ½", "Ñ…Ð¾Ð¾Ð»", "Ñ†Ð°Ð¹", "Ð¸Ð´ÑÑ…", "ÑƒÑƒÑ…", "ÑÐ²Ð°Ñ…", "Ð¸Ñ€ÑÑ…", "Ñ…Ð°Ñ€Ð°Ñ…", "ÑÐ¾Ð½ÑÐ¾Ñ…"],
            "my": ["á€€á€»á€½á€”á€ºá€á€±á€¬á€º", "á€žá€„á€º", "á€€á€»á€½á€”á€ºá€á€±á€¬á€ºá€á€­á€¯á€·", "á€žá€°á€á€­á€¯á€·", "á€’á€«", "á€¡á€²á€’á€«", "á€˜á€¬á€œá€²", "á€˜á€šá€ºá€™á€¾á€¬", "á€˜á€šá€ºá€á€±á€¬á€·", "á€˜á€¬á€€á€¼á€±á€¬á€„á€·á€º", "á€˜á€šá€ºá€œá€­á€¯", "á€‘á€™á€„á€ºá€¸", "á€œá€€á€ºá€–á€€á€ºá€›á€Šá€º", "á€…á€¬á€¸á€á€šá€º", "á€žá€±á€¬á€€á€ºá€á€šá€º", "á€žá€½á€¬á€¸á€™á€šá€º", "á€œá€¬á€™á€šá€º", "á€™á€¼á€„á€ºá€á€šá€º", "á€€á€¼á€¬á€¸á€á€šá€º"],
            "lo": ["àº‚à»‰àº­àº", "à»€àºˆàº»à»‰àº²", "àºžàº§àºà»€àº®àº»àº²", "àºžàº§àºà»€àº‚àº»àº²", "àº­àº±àº™àº™àºµà»‰", "àº­àº±àº™àº™àº±à»‰àº™", "àº«àºàº±àº‡", "àº—àºµà»ˆà»ƒàº”", "à»€àº¡àº·à»ˆàº­à»ƒàº”", "à»€àº›àº±àº™àº«àºàº±àº‡", "à»àº™àº§à»ƒàº”", "à»€àº‚àº»à»‰àº²", "àºŠàº²", "àºàº´àº™", "àº”àº·à»ˆàº¡", "à»„àº›", "àº¡àº²", "à»€àº«àº±àº™", "à»„àº”à»‰àºàº´àº™"],
            "km": ["ážáŸ’áž‰áž»áŸ†", "áž¢áŸ’áž“áž€", "áž™áž¾áž„", "áž–áž½áž€áž‚áŸ", "áž“áŸáŸ‡", "áž“áŸ„áŸ‡", "áž¢áŸ’ážœáž¸", "áž‘áž¸ážŽáž¶", "áž–áŸáž›ážŽáž¶", "áž áŸážáž»áž¢áŸ’ážœáž¸", "ážŠáž¼áž…áž˜áŸ’ážŠáŸáž…", "áž”áž¶áž™", "ážáŸ‚", "áž‰áž»áž¶áŸ†", "áž•áž¹áž€", "áž‘áŸ…", "áž˜áž€", "ážƒáž¾áž‰", "áž®"],
            "ceb": ["ako", "ikaw", "kami", "sila", "kini", "kadtong", "unsa", "asa", "kanus-a", "ngano", "unsaon", "kan-on", "tsaa", "kaon", "inom", "adto", "anha", "tan-aw", "dungog"],
            "ilo": ["siak", "sika", "datayo", "da", "daytoy", "dayta", "ania", "sadino", "kapigan", "apay", "kasano", "kanen", "te", "mangan", "uminum", "mapan", "umay", "makita", "mangngeg"],
            "mg": ["aho", "ianao", "isika", "izy ireo", "ity", "izany", "inona", "taiza", "oviana", "nahoana", "aza", "vary", "dite", "mihinana", "misotroa", "mankany", "avy", "mahita", "mandre"],
            "af": ["ek", "jy", "ons", "hulle", "hierdie", "daardie", "wat", "waar", "wanneer", "hoekom", "hoe", "rys", "tee", "eet", "drink", "gaan", "kom", "sien", "hoor"],
            "sw": ["mimi", "wewe", "sisi", "wao", "hii", "hiyo", "nini", "wapi", "lini", "kwanini", "vipi", "chakula", "chai", "kula", "kunywa", "kwenda", "kuja", "kuona", "kusikia"],
            "so": ["aniga", "adiga", "annaga", "iyaga", "kan", "taas", "maxaa", "xaggee", "goorma", "maxaa", "sida", "bariis", "shaah", "cunaa", "cabb", "tagaa", "imaadaa", "arkaa", "maqlaa"],
            "rw": ["njye", "wowe", "twebwe", "bo", "iri", "ryo", "iki", "he", "ryari", "kuki", "bite", "ibiryo", "icyayi", "ndarya", "ndanywa", "ngenda", "ngaruka", "ndabona", "ndumva"],
            "st": ["ke", "u", "re", "ba", "see", "seo", "eng", "kae", "neng", "hobaneng", "joang", "dijo", "tee", "ja", "nwa", "ya", "tla", "bona", "utlwa"],
            "xh": ["ndi", "u", "si", "ba", "le", "lo", "yintoni", "phi", "nini", "kutheni", "njani", "irayisi", "iti", "itya", "sela", "hamba", "fika", "bona", "va"],
            "tn": ["ke", "o", "re", "bone", "se", "seo", "eng", "kwa", "leng", "goreng", "jang", "dijo", "tee", "ja", "nwa", "ya", "tla", "bona", "utlwa"],
        }
        words = set(text.lower().split())
        scores = {lang: sum(1 for kw in kws if kw in words) for lang, kws in kw_map.items()}
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "es"

    def get_language_name(self, lang):
        names = {
            "es": "espaÃ±ol", "en": "inglÃ©s", "fr": "francÃ©s", "de": "alemÃ¡n",
            "it": "italiano", "pt": "portuguÃ©s", "tr": "turco", "ru": "ruso",
            "uk": "ucraniano", "zh": "chino", "ja": "japonÃ©s", "ko": "coreano",
            "ar": "Ã¡rabe", "hi": "hindi", "bn": "bengalÃ­", "pa": "punyabÃ­",
            "gu": "gujarati", "ta": "tamil", "te": "telugu", "kn": "kannada",
            "ml": "malayalam", "si": "cingalÃ©s", "he": "hebreo", "th": "tailandÃ©s",
            "el": "griego", "hy": "armenio", "ka": "georgiano", "am": "amhÃ¡rico",
            "my": "birmano", "km": "jemer", "lo": "lao", "bo": "tibetano",
            "nl": "neerlandÃ©s", "sv": "sueco", "pl": "polaco", "cs": "checo",
            "hu": "hÃºngaro", "ro": "rumano", "vi": "vietnamita", "id": "indonesio",
            "fa": "persa", "ur": "urdu", "sw": "suajili"
        }
        return names.get(lang, f"idioma detectado ({lang})")

    def normalize_language_code(self, lang):
        if not lang:
            return "es"
        value = str(lang).strip().lower()
        aliases = {
            "spanish": "es", "espanol": "es", "espaÃ±ol": "es", "castellano": "es",
            "english": "en", "ingles": "en", "inglÃ©s": "en",
            "french": "fr", "frances": "fr", "francÃ©s": "fr",
            "german": "de", "aleman": "de", "alemÃ¡n": "de",
            "italian": "it", "italiano": "it",
            "portuguese": "pt", "portugues": "pt", "portuguÃ©s": "pt",
            "chinese": "zh", "chino": "zh", "japanese": "ja", "japones": "ja", "japonÃ©s": "ja",
            "korean": "ko", "coreano": "ko", "arabic": "ar", "arabe": "ar", "Ã¡rabe": "ar",
            "russian": "ru", "ruso": "ru", "hindi": "hi", "turkish": "tr", "turco": "tr",
            "dutch": "nl", "neerlandes": "nl", "neerlandÃ©s": "nl",
            "swedish": "sv", "sueco": "sv", "polish": "pl", "polaco": "pl",
            "greek": "el", "griego": "el", "hebrew": "he", "hebreo": "he",
            "thai": "th", "tailandes": "th", "tailandÃ©s": "th",
            "vietnamese": "vi", "vietnamita": "vi", "indonesian": "id", "indonesio": "id",
            "persian": "fa", "persa": "fa", "urdu": "ur", "swahili": "sw", "suajili": "sw"
        }
        return aliases.get(value, value[:8])

    def build_multilingual_instruction(self, prompt, current_mood, memory_context, lang=None):
        lang = lang or self.detect_lang(prompt)
        lang_name = self.get_language_name(lang)
        return (
            "Eres MoonBot, una IA de gestiÃ³n de Telegram. "
            f"Mood: {current_mood}. Contexto: {memory_context}. "
            f"Idioma detectado: {lang_name}. "
            "Responde SIEMPRE en el mismo idioma y alfabeto del usuario. "
            "Si el usuario mezcla idiomas, responde en el idioma dominante. "
            "No traduzcas al espaÃ±ol salvo que el usuario lo pida."
        )

    def clean_translation_output(self, text):
        if not text:
            return ""
        cleaned = text.strip()
        cleaned = re.sub(r"^\s*(traducci[oÃ³]n|translation)\s*[:\-]\s*", "", cleaned, flags=re.I)
        cleaned = cleaned.strip().strip('"').strip("'").strip()
        return cleaned

    def normalize_translation_text(self, text):
        normalized = str(text or "").lower()
        for src, dst in str.maketrans("Ã¡Ã©Ã­Ã³ÃºÃ¼Ã±Ã§", "aeiouunc").items():
            normalized = normalized.replace(chr(src), chr(dst))
        normalized = re.sub(r"[^\w\s]", "", normalized, flags=re.UNICODE)
        return re.sub(r"\s+", " ", normalized).strip()

    def get_translation_memory(self):
        memory = db.get("IA_TRANSLATION_MEMORY", {})
        return memory if isinstance(memory, dict) else {}

    def learn_translation(self, original, translated, target_lang, source_lang=None, source="local"):
        if not original or not translated:
            return
        target_lang = self.normalize_language_code(target_lang)
        source_lang = self.normalize_language_code(source_lang) if source_lang else self.detect_lang(original)
        original_key = self.normalize_translation_text(original)
        translated_key = self.normalize_translation_text(translated)
        if not original_key or not translated_key or original_key == translated_key:
            return

        memory = self.get_translation_memory()
        pair_key = f"{source_lang}>{target_lang}"
        reverse_key = f"{target_lang}>{source_lang}"
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        memory.setdefault(pair_key, {})[original_key] = {"text": translated, "source": source, "updated": now}
        memory.setdefault(reverse_key, {})[translated_key] = {"text": original, "source": source, "updated": now}
        db.set("IA_TRANSLATION_MEMORY", memory)
        self.learn(f"{original} {translated}", source=f"TraducciÃ³n {source_lang}>{target_lang} ({source})")

    def translate_from_memory(self, text, target_lang, source_lang):
        pair_key = f"{source_lang}>{target_lang}"
        text_key = self.normalize_translation_text(text)
        learned = self.get_translation_memory().get(pair_key, {}).get(text_key)
        return learned.get("text", "") if learned else None

    def _translation_result(self, translated, engine, return_meta):
        return (translated, engine) if return_meta else translated

    def local_translate_phrase(self, text, target_lang):
        phrasebook = {
            "hola": {"en": "hello", "fr": "bonjour", "de": "hallo", "it": "ciao", "pt": "olÃ¡"},
            "buenos dias": {"en": "good morning", "fr": "bonjour", "de": "guten Morgen", "it": "buongiorno", "pt": "bom dia"},
            "buenas noches": {"en": "good night", "fr": "bonne nuit", "de": "gute Nacht", "it": "buona notte", "pt": "boa noite"},
            "gracias": {"en": "thank you", "fr": "merci", "de": "danke", "it": "grazie", "pt": "obrigado"},
            "por favor": {"en": "please", "fr": "s'il vous plaÃ®t", "de": "bitte", "it": "per favore", "pt": "por favor"},
            "de nada": {"en": "you're welcome", "fr": "de rien", "de": "gern geschehen", "it": "prego", "pt": "de nada"},
            "adios": {"en": "goodbye", "fr": "au revoir", "de": "auf Wiedersehen", "it": "arrivederci", "pt": "adeus"},
            "como estas": {"en": "how are you", "fr": "comment Ã§a va", "de": "wie geht es dir", "it": "come stai", "pt": "como estÃ¡ vocÃª"},
            "te quiero": {"en": "I love you", "fr": "je t'aime", "de": "ich liebe dich", "it": "ti amo", "pt": "eu te amo"},
            "bienvenido": {"en": "welcome", "fr": "bienvenue", "de": "willkommen", "it": "benvenuto", "pt": "bem-vindo"},
        }
        normalized = text.lower()
        for src, dst in str.maketrans("Ã¡Ã©Ã­Ã³ÃºÃ¼Ã±Ã§", "aeiouunc").items():
            normalized = normalized.replace(chr(src), chr(dst))
        normalized = re.sub(r"[^\w\s]", "", normalized, flags=re.UNICODE).strip()
        return phrasebook.get(normalized, {}).get(target_lang)

    def translate_text(self, text, target_lang, source_lang=None, return_meta=False):
        if not text:
            return self._translation_result("", "empty", return_meta)
        target_lang = self.normalize_language_code(target_lang)
        source_lang = self.normalize_language_code(source_lang) if source_lang else self.detect_lang(text)
        target_name = self.get_language_name(target_lang)
        source_name = self.get_language_name(source_lang)

        if source_lang == target_lang:
            return self._translation_result(text, "same_language", return_meta)

        learned = self.translate_from_memory(text, target_lang, source_lang)
        if learned:
            return self._translation_result(learned, "local_memory", return_meta)

        local = self.local_translate_phrase(text, target_lang)
        if local:
            self.learn_translation(text, local, target_lang, source_lang=source_lang, source="phrasebook")
            return self._translation_result(local, "local_phrasebook", return_meta)

        try:
            if LLM_PROVIDER == "gemini" and GEMINI_API_KEY:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": (
                                f"Traduce del {source_name} al {target_name}. "
                                "Devuelve solo la traducciÃ³n, sin explicaciÃ³n ni comillas.\n\n"
                                f"Texto: {text}"
                            )
                        }]
                    }]
                }
                r = requests.post(url, json=payload, timeout=15)
                if r.status_code == 200:
                    translated = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                    translated = self.clean_translation_output(translated)
                    self.learn_translation(text, translated, target_lang, source_lang=source_lang, source="gemini")
                    return self._translation_result(translated, "gemini_learned", return_meta)

            if LLM_PROVIDER == "ollama":
                payload = {
                    "model": OLLAMA_MODEL,
                    "prompt": (
                        f"Translate from {source_name} to {target_name}. "
                        "Return only the translation, without notes or quotes.\n\n"
                        f"Text: {text}\nTranslation:"
                    ),
                    "stream": False
                }
                r = requests.post(OLLAMA_URL, json=payload, timeout=35)
                if r.status_code == 200:
                    translated = self.clean_translation_output(r.json().get("response", ""))
                    self.learn_translation(text, translated, target_lang, source_lang=source_lang, source="ollama")
                    return self._translation_result(translated, "ollama_learned", return_meta)
                add_web_log("WARNING", f"Ollama traducciÃ³n respondiÃ³ {r.status_code}: {r.text[:200]}")
        except requests.exceptions.ConnectionError:
            add_web_log("ERROR", f"No se puede conectar con {LLM_PROVIDER.upper()} para traducir.")
        except requests.exceptions.Timeout:
            add_web_log("WARNING", f"Timeout al traducir con {LLM_PROVIDER.upper()}.")
        except Exception as e:
            add_web_log("ERROR", f"Fallo traduciendo con IA externa: {e}")

        if LLM_PROVIDER != "ollama":
            try:
                payload = {
                    "model": OLLAMA_MODEL,
                    "prompt": (
                        f"Translate from {source_name} to {target_name}. "
                        "Return only the translation, without notes or quotes.\n\n"
                        f"Text: {text}\nTranslation:"
                    ),
                    "stream": False
                }
                r = requests.post(OLLAMA_URL, json=payload, timeout=35)
                if r.status_code == 200:
                    translated = self.clean_translation_output(r.json().get("response", ""))
                    if translated:
                        self.learn_translation(text, translated, target_lang, source_lang=source_lang, source="ollama_fallback")
                        return self._translation_result(translated, "ollama_fallback_learned", return_meta)
                add_web_log("WARNING", f"Ollama fallback traducciÃ³n respondiÃ³ {r.status_code}: {r.text[:200]}")
            except requests.exceptions.ConnectionError:
                add_web_log("ERROR", f"No se puede conectar con Ollama fallback para traducir ({OLLAMA_URL}).")
            except requests.exceptions.Timeout:
                add_web_log("WARNING", "Timeout al traducir con Ollama fallback.")
            except Exception as e:
                add_web_log("ERROR", f"Fallo traduciendo con Ollama fallback: {e}")

        fallback = (
            f"[TraducciÃ³n no disponible sin Gemini/Ollama] {text}"
            if source_lang != target_lang else text
        )
        return self._translation_result(fallback, "unavailable", return_meta)

    def parse_translation_request(self, text):
        if not text:
            return None
        clean = re.sub(r"\s+", " ", str(text)).strip()
        clean = re.sub(r"@\w+", "", clean).strip()
        lang_token = r"[a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃ¼Ã±ÃÃ‰ÃÃ“ÃšÃœÃ‘Ã§Ã‡]{2,24}"
        patterns = [
            rf"(?i)^(?:traduce|traducir|traduceme|tradÃºceme)\s+(?:esto\s+)?(?:al|a|en)\s+({lang_token})\s*[:\-]\s*(.+)$",
            rf"(?i)^(?:traduce|traducir|traduceme|tradÃºceme)\s+(.+?)\s+(?:al|a|en)\s+({lang_token})\s*$",
            rf"(?i)^como\s+se\s+dice\s+(.+?)\s+en\s+({lang_token})\s*\??$",
            rf"(?i)^cÃ³mo\s+se\s+dice\s+(.+?)\s+en\s+({lang_token})\s*\??$",
            rf"(?i)^translate\s+(?:this\s+)?(?:to|into)\s+({lang_token})\s*[:\-]\s*(.+)$",
            rf"(?i)^translate\s+(.+?)\s+(?:to|into)\s+({lang_token})\s*$",
            rf"(?i)^how\s+do\s+you\s+say\s+(.+?)\s+in\s+({lang_token})\s*\??$",
        ]
        target_first = {0, 4}
        for idx, pattern in enumerate(patterns):
            match = re.match(pattern, clean)
            if not match:
                continue
            if idx in target_first:
                target_lang, source_text = match.group(1), match.group(2)
            else:
                source_text, target_lang = match.group(1), match.group(2)
            source_text = source_text.strip().strip('"').strip("'").strip()
            source_text = re.sub(r"^(esto|this)\s*[:\-]?\s*", "", source_text, flags=re.I).strip()
            return {
                "text": source_text,
                "target_lang": self.normalize_language_code(target_lang)
            }
        return None

    def answer_translation_request(self, text, fallback_text=None):
        request_data = self.parse_translation_request(text)
        if not request_data:
            return None
        source_text = request_data.get("text", "")
        if fallback_text and self.normalize_translation_text(source_text) in ["", "esto", "this", "eso", "that"]:
            source_text = fallback_text
        if not source_text:
            return "Necesito el texto que quieres traducir."
        target_lang = request_data["target_lang"]
        translated, engine = self.translate_text(source_text, target_lang, return_meta=True)
        target_name = self.get_language_name(target_lang)
        engine_labels = {
            "local_memory": "memoria local",
            "local_phrasebook": "IA local",
            "gemini_learned": "Gemini + aprendido",
            "ollama_learned": "Ollama + aprendido",
            "ollama_fallback_learned": "Ollama + aprendido",
            "same_language": "mismo idioma",
            "unavailable": "sin traducciÃ³n"
        }
        return f"TraducciÃ³n a {target_name} ({engine_labels.get(engine, engine)}):\n\n{translated}"

    def evolve_process(self):
        add_web_log("INFO", "ðŸ§  Iniciando Protocolo de EvoluciÃ³n Neuronal...")
        # Tomar las 100 palabras con mÃ¡s conexiones y generar frases desde ellas
        top_words = sorted(
            [(w, sum(v.values()) if isinstance(v, Counter) else len(v))
             for w, v in self.brain["keywords"].items() if len(w) > 3],
            key=lambda x: x[1], reverse=True
        )[:100]

        total = len(top_words)
        for i, (word, _) in enumerate(top_words):
            phrase = self.generate(word)
            self.learn(phrase, source="EvoluciÃ³n Neural")
            if i % 20 == 0:
                add_web_log("DEBUG", f"ðŸ§¬ EvoluciÃ³n: {int((i/max(total,1))*100)}% completado.")

        # Forzar escritura en BD al finalizar
        db.set("IA_BRAIN", self.brain)
        db.set("IA_SOURCES", self._sources_cache)
        add_web_log("SUCCESS", "ðŸ”¥ EvoluciÃ³n Neuronal Completada. Nuevas conexiones creadas.")

    def set_mood(self, mood):
        self.mood = mood
        db.set("IA_MOOD", mood)
        add_web_log("INFO", f"Personalidad IA cambiada a: {mood.upper()}")
    
    def load_brain(self):
        """Recarga el cerebro desde la base de datos en caliente (Hot-Reload)."""
        res = db.get("IA_BRAIN")
        if res:
            self.brain = res
            self._ensure_counters()
            self._sources_cache = db.get("IA_SOURCES", {})
            add_web_log("IA", "Cerebro sincronizado con la base de datos (Hot-Reload OK).")
            return True
        return False

    def set_mode(self, mode):
        self.mode = mode
        db.set("IA_MODE", mode)
        add_web_log("INFO", f"Modo IA cambiado a: {mode.upper()}")

    
    def learn(self, text, source="Cerebro Local"):
        if not text or len(text) < 2: return
        text = _force_utf8(text)

        # Logs de depuraciÃ³n para confirmar recepciÃ³n
        add_web_log("IA", f"ðŸ§  Aprendiendo de '{source}': {text[:30]}...")

        words = text.lower().split()
        new_words = 0
        now_str = datetime.datetime.now().strftime("%H:%M:%S")

        with self.brain_lock:
            for i, w in enumerate(words):
                w = "".join(filter(str.isalnum, w))
                if not w or len(w) < 2: continue

                if w not in self.brain["keywords"]:
                    self.brain["keywords"][w] = Counter()
                    new_words += 1
                    if w not in self._sources_cache:
                        self._sources_cache[w] = source

                if len(w) > 3:
                    self._activity_cache.append({"word": w, "source": source, "time": now_str})

                if i < len(words) - 1:
                    next_w = "".join(filter(str.isalnum, words[i+1]))
                    if next_w:
                        if not isinstance(self.brain["keywords"][w], Counter):
                            self.brain["keywords"][w] = Counter(self.brain["keywords"][w])
                        self.brain["keywords"][w][next_w] += 1

        self.session_words += new_words
        self._learn_count += 1

        # Mantener actividad acotada en memoria
        if len(self._activity_cache) > 200:
            self._activity_cache = self._activity_cache[-50:]

        # Escritura en BD mÃ¡s frecuente (cada 5 aprendizajes) para feedback visual
        if self._learn_count % 2 == 0:
            db.set("IA_BRAIN", self.brain)
            db.set("IA_SOURCES", self._sources_cache)
            db.set("IA_ACTIVITY", self._activity_cache[-50:])
            add_web_log("DEBUG", f"ðŸ’¾ Cerebro persistido en DB (Total: {len(self.brain['keywords'])} neuronas)")

    def remember_context(self, chat_id, text, role="user"):
        """Guarda el mensaje en la ventana de contexto del chat (en memoria y BD)."""
        if not chat_id or not text:
            return
        if chat_id not in self._context_cache:
            self._context_cache[chat_id] = db.get(f"CONTEXT_{chat_id}", [])
        self._context_cache[chat_id].append({"role": role, "text": text[:200]})
        if len(self._context_cache[chat_id]) > 12:
            self._context_cache[chat_id] = self._context_cache[chat_id][-12:]
        db.set(f"CONTEXT_{chat_id}", self._context_cache[chat_id])

    def get_context_words(self, chat_id):
        """Devuelve las palabras de las Ãºltimas 6 entradas del contexto del chat."""
        if not chat_id:
            return set()
        if chat_id not in self._context_cache:
            self._context_cache[chat_id] = db.get(f"CONTEXT_{chat_id}", [])
        ctx = self._context_cache[chat_id]
        words = set()
        for entry in ctx[-6:]:
            for w in entry["text"].lower().split():
                if len(w) > 2:
                    words.add(w)
        return words

    def _call_ollama(self, prompt, system_instruction):
        """Llama a Ollama con circuit breaker y timeout separado connect/read."""
        now = time.time()
        if now - self._ollama_last_fail < self._ollama_fail_cooldown:
            remaining = int(self._ollama_fail_cooldown - (now - self._ollama_last_fail))
            add_web_log("DEBUG", f"Ollama en cooldown ({remaining}s restantes) â€” saltando.")
            return ""
        try:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": f"{system_instruction}\n\nUsuario: {prompt}\nMoonBot:",
                "stream": False
            }
            # connect_timeout=3s (falla rÃ¡pido si no hay servidor), read_timeout=30s (inferencia lenta OK)
            r = self._ollama_session.post(OLLAMA_URL, json=payload, timeout=(3, 30))
            if r.status_code == 200:
                return r.json().get("response", "").strip()
            add_web_log("WARNING", f"Ollama HTTP {r.status_code}: {r.text[:120]}")
            self._ollama_last_fail = time.time()
        except requests.exceptions.ConnectionError:
            self._ollama_last_fail = time.time()
            add_web_log("WARNING", f"Ollama no disponible ({OLLAMA_URL}) â€” cooldown {self._ollama_fail_cooldown}s.")
        except requests.exceptions.Timeout:
            self._ollama_last_fail = time.time()
            add_web_log("WARNING", "Ollama connect timeout (>3s) â€” cooldown activado.")
        except Exception as e:
            self._ollama_last_fail = time.time()
            add_web_log("ERROR", f"Ollama error: {e}")
        return ""

    def _call_gemini(self, prompt, system_instruction):
        """Llama a Gemini y devuelve la respuesta o cadena vacÃ­a si falla."""
        if not GEMINI_API_KEY:
            return ""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
            payload = {"contents": [{"parts": [{"text": f"{system_instruction}\n\nUsuario: {prompt}"}]}]}
            r = requests.post(url, json=payload, timeout=15)
            if r.status_code == 200:
                return r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            add_web_log("WARNING", f"Gemini HTTP {r.status_code}: {r.text[:120]}")
        except requests.exceptions.Timeout:
            add_web_log("WARNING", "Gemini timeout (>15s) â€” usando Markov.")
        except Exception as e:
            add_web_log("ERROR", f"Gemini error: {e}")
        return ""

    def generate(self, prompt, chat_id=None, mood_override=None, ai_preference=None):
        """Genera una respuesta normalizada a UTF-8.

        Detecta el idioma del mensaje entrante con langdetect y se lo pasa a
        _generate_raw() para que el bot intente responder en el mismo idioma.
        """
        lang = (detect_language_code(prompt) or "").split("-")[0]  # 'zh-cn' -> 'zh'
        answer = self._generate_raw(prompt, chat_id, mood_override, ai_preference, lang=lang)
        return _force_utf8(answer or "")

    def _generate_raw(self, prompt, chat_id=None, mood_override=None, ai_preference=None, lang=None):
        current_mood = mood_override or self.mood
        # Idioma del usuario: usa el detectado por langdetect; si no, el detector interno.
        lang = lang or self.detect_lang(prompt)

        # RAG: contexto de memoria local
        memory_context = ""
        if chat_id:
            prompt_words = [w for w in prompt.lower().split() if len(w) > 3]
            if prompt_words:
                history = db.get("GLOBAL_HISTORY", [])
                relevant_msgs = []
                for m in history:
                    if any(pw in m.get("text", "").lower() for pw in prompt_words):
                        relevant_msgs.append(f"{m.get('user')}: {m.get('text')}")
                    if len(relevant_msgs) >= 5:
                        break
                if relevant_msgs:
                    memory_context = "\n[Memoria Reciente]:\n" + "\n".join(relevant_msgs)

        # â”€â”€ CAPA 1: Markov (siempre se genera, respuesta local instantÃ¡nea) â”€â”€â”€â”€â”€â”€
        mood_prefix = ""
        if current_mood == "sarcastic": mood_prefix = "[Sarcasmo] "
        elif current_mood == "serious": mood_prefix = "[Oficial] "
        elif current_mood == "aggressive": mood_prefix = "[ProtecciÃ³n] "
        elif current_mood == "cyberpunk": mood_prefix = "[Neo-Link] "

        prompt_words = [w for w in prompt.lower().split() if len(w) > 2]
        context_words = self.get_context_words(chat_id)
        all_relevant = prompt_words + list(context_words)

        # Seleccionar semilla: la palabra con mayor score de conexiones + relevancia al contexto
        seed = None
        best_score = -1
        for w in all_relevant:
            if w in self.brain["keywords"]:
                v = self.brain["keywords"][w]
                conn_count = sum(v.values()) if isinstance(v, Counter) else len(v)
                # Bonus por conexiÃ³n con otras palabras del contexto
                ctx_bonus = sum(1 for cw in context_words if cw in (v if isinstance(v, dict) else {}))
                score = conn_count + ctx_bonus * 4
                if score > best_score:
                    best_score = score
                    seed = w

        if not seed:
            if self.brain["keywords"]:
                seed = random.choice(list(self.brain["keywords"].keys()))
            else:
                seed = "hola"

        res = [seed.capitalize()]
        curr = seed
        history = [curr]

        max_words = 8 if self.mode == "eco" else 20 if self.mode == "balanced" else 35
        min_words = 3 if self.mode == "eco" else 7 if self.mode == "balanced" else 12

        for _ in range(random.randint(min_words, max_words)):
            next_words_raw = self.brain["keywords"].get(curr, {})
            if not next_words_raw:
                break

            if isinstance(next_words_raw, (list, dict)):
                next_words = Counter(next_words_raw)
            else:
                next_words = next_words_raw

            choices = []
            weights = []
            for word, count in next_words.most_common(10):
                penalty = 0.05 if word in history[-5:] else 1.0
                # Priorizar palabras que aparecen en el contexto del chat
                ctx_boost = 2.5 if word in context_words else 1.0
                choices.append(word)
                weights.append(count * penalty * ctx_boost)

            if not choices:
                break

            total_weight = sum(weights)
            r_val = random.uniform(0, total_weight)
            upto = 0
            selected = choices[-1]
            for i, w in enumerate(weights):
                upto += w
                if upto >= r_val:
                    selected = choices[i]
                    break

            curr = selected
            res.append(curr)
            history.append(curr)

            if len(res) % 7 == 0 and len(res) < max_words - 2:
                res[-1] += ","
                connectors = {
                    "es": ["y", "pero", "ademÃ¡s", "aunque", "porque", "sin embargo"],
                    "en": ["and", "but", "also", "although", "because", "however"],
                    "fr": ["et", "mais", "aussi", "bien que", "parce que", "cependant"],
                    "de": ["und", "aber", "auch", "obwohl", "weil", "jedoch"],
                    "it": ["e", "ma", "anche", "sebbene", "perchÃ©", "tuttavia"],
                    "pt": ["e", "mas", "tambÃ©m", "embora", "porque", "no entanto"],
                    "tr": ["ve", "ama", "ayrÄ±ca", "ancak", "Ã§Ã¼nkÃ¼", "fakat"],
                    "ru": ["Ð¸", "Ð½Ð¾", "Ñ‚Ð°ÐºÐ¶Ðµ", "Ñ…Ð¾Ñ‚Ñ", "Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾", "Ð¾Ð´Ð½Ð°ÐºÐ¾"],
                    "zh": ["å’Œ", "ä½†æ˜¯", "ä¹Ÿ", "è™½ç„¶", "å› ä¸º", "ç„¶è€Œ"],
                    "ja": ["ãã—ã¦", "ã§ã‚‚", "ã¾ãŸ", "ã‘ã‚Œã©ã‚‚", "ãªãœãªã‚‰", "ã—ã‹ã—"],
                    "ko": ["ê·¸ë¦¬ê³ ", "í•˜ì§€ë§Œ", "ë˜í•œ", "ë¹„ë¡", "ì™œëƒí•˜ë©´", "ê·¸ëŸ¬ë‚˜"],
                    "ar": ["Ùˆ", "Ù„ÙƒÙ†", "Ø£ÙŠØ¶Ø§Ù‹", "Ø±ØºÙ… Ø£Ù†", "Ù„Ø£Ù†", "ÙˆÙ…Ø¹ Ø°Ù„Ùƒ"],
                    "hi": ["à¤”à¤°", "à¤²à¥‡à¤•à¤¿à¤¨", "à¤­à¥€", "à¤¹à¤¾à¤²à¤¾à¤‚à¤•à¤¿", "à¤•à¥à¤¯à¥‹à¤‚à¤•à¤¿", "à¤«à¤¿à¤° à¤­à¥€"],
                    "nl": ["en", "maar", "ook", "hoewel", "omdat", "echter"],
                    "sv": ["och", "men", "ocksÃ¥", "Ã¤ven om", "eftersom", "dock"],
                    "pl": ["i", "ale", "rÃ³wnieÅ¼", "chociaÅ¼", "poniewaÅ¼", "jednak"],
                    "cs": ["a", "ale", "takÃ©", "aÄkoli", "protoÅ¾e", "vÅ¡ak"],
                    "hu": ["Ã©s", "de", "is", "bÃ¡r", "mert", "azonban"],
                    "ro": ["È™i", "dar", "de asemenea", "deÈ™i", "pentru cÄƒ", "totuÈ™i"],
                    "uk": ["Ñ–", "Ð°Ð»Ðµ", "Ñ‚Ð°ÐºÐ¾Ð¶", "Ñ…Ð¾Ñ‡Ð°", "Ñ‚Ð¾Ð¼Ñƒ Ñ‰Ð¾", "Ð¾Ð´Ð½Ð°Ðº"],
                    "he": ["×•", "××‘×œ", "×’×", "×œ×ž×¨×•×ª", "×›×™", "×¢× ×–××ª"],
                    "th": ["å’Œ", "à¹à¸•à¹ˆ", "à¸à¹‡", "à¹à¸¡à¹‰à¸§à¹ˆà¸²", "à¹€à¸žà¸£à¸²à¸°", "à¸­à¸¢à¹ˆà¸²à¸‡à¹„à¸£à¸à¹‡à¸•à¸²à¸¡"],
                    "da": ["og", "men", "ogsÃ¥", "selvom", "fordi", "dog"],
                    "no": ["og", "men", "ogsÃ¥", "selv om", "fordi", "likevel"],
                    "fi": ["ja", "mutta", "myÃ¶s", "vaikka", "koska", "kuitenkin"],
                    "et": ["ja", "aga", "ka", "kuigi", "sest", "siiski"],
                    "lv": ["un", "bet", "arÄ«", "lai gan", "tÄpÄ“c ka", "tomÄ“r"],
                    "lt": ["ir", "bet", "taip pat", "nors", "nes", "taÄiau"],
                    "sk": ["a", "ale", "tieÅ¾", "hoci", "pretoÅ¾e", "napriek tomu"],
                    "sl": ["in", "ampak", "tudi", "Äeprav", "ker", "vendar"],
                    "hr": ["i", "ali", "takoÄ‘er", "iako", "jer", "ipak"],
                    "bs": ["i", "ali", "takoÄ‘er", "iako", "jer", "ipak"],
                    "sr": ["i", "ali", "takoÄ‘e", "iako", "jer", "ipak"],
                    "mk": ["Ð¸", "Ð½Ð¾", "Ð¸ÑÑ‚Ð¾ Ñ‚Ð°ÐºÐ°", "Ð¸Ð°ÐºÐ¾", "Ð·Ð°Ñ‚Ð¾Ð° ÑˆÑ‚Ð¾", "ÑÐµÐ¿Ð°Ðº"],
                    "bg": ["Ð¸", "Ð½Ð¾", "ÑÑŠÑ‰Ð¾", "Ð²ÑŠÐ¿Ñ€ÐµÐºÐ¸ Ñ‡Ðµ", "Ð·Ð°Ñ‰Ð¾Ñ‚Ð¾", "Ð¾Ð±Ð°Ñ‡Ðµ"],
                    "sq": ["dhe", "por", "edhe", "megjithÃ«se", "sepse", "sidoqoftÃ«"],
                    "mt": ["u", "imma", "ukoll", "gÄ§alkemm", "gÄ§aliex", "madankollu"],
                    "is": ["og", "en", "einnig", "Ã¾Ã³ aÃ°", "af Ã¾vÃ­ aÃ°", "Ã¾Ã³"],
                    "ga": ["agus", "ach", "freisin", "cÃ©", "mar", "Ã¡fach"],
                    "cy": ["a", "ond", "hefyd", "er", "oherwydd", "serch hynny"],
                    "gd": ["agus", "ach", "cuideachd", "ged", "oir", "gidheadh"],
                    "eu": ["eta", "baina", "ere", "nahiz eta", "zergatik", "hala ere"],
                    "ca": ["i", "perÃ²", "tambÃ©", "tot i que", "perquÃ¨", "tanmateix"],
                    "gl": ["e", "mais", "tamÃ©n", "aÃ­nda que", "porque", "non obstante"],
                    "oc": ["e", "mas", "tanben", "quand ben", "perque", "nonobstant"],
                    "br": ["ha", "met", "ivez", "memestra", "rak", "memes tra"],
                    "fy": ["en", "mar", "ek", "hoewol", "om't", "doch"],
                    "lb": ["an", "awer", "och", "obwuel", "well", "trotzdem"],
                    "wa": ["et", "mins", "ossu", "co", "paskÃ¨", "tote li"],
                    "sc": ["e", "ma", "ancu", "bainzu", "ca", "nonostante"],
                    "co": ["Ã¨", "ma", "ancu", "benchÃ©", "perchÃ©", "tuttavia"],
                    "rm": ["e", "ma", "era", "schabuin", "perquai", "tuttina"],
                    "bn": ["à¦à¦¬à¦‚", "à¦•à¦¿à¦¨à§à¦¤à§", "à¦à¦›à¦¾à¦¡à¦¼à¦¾à¦“", "à¦¯à¦¦à¦¿à¦“", "à¦•à¦¾à¦°à¦£", "à¦¤à¦¬à§à¦“"],
                    "vi": ["vÃ ", "nhÆ°ng", "cÅ©ng", "máº·c dÃ¹", "vÃ¬", "tuy nhiÃªn"],
                    "ta": ["à®®à®±à¯à®±à¯à®®à¯", "à®†à®©à®¾à®²à¯", "à®®à¯‡à®²à¯à®®à¯", "à®Žà®©à¯à®±à®¾à®²à¯à®®à¯", "à®à®©à¯†à®©à¯à®±à®¾à®²à¯", "à®‡à®°à¯à®ªà¯à®ªà®¿à®©à¯à®®à¯"],
                    "te": ["à°®à°°à°¿à°¯à±", "à°•à°¾à°¨à±€", "à°•à±‚à°¡à°¾", "à°…à°¯à°¿à°¨à°ªà±à°ªà°Ÿà°¿à°•à±€", "à°Žà°‚à°¦à±à°•à°‚à°Ÿà±‡", "à°…à°¯à°¿à°¨à°ªà±à°ªà°Ÿà°¿à°•à±€"],
                    "mr": ["à¤†à¤£à¤¿", "à¤ªà¤£", "à¤¸à¥à¤¦à¥à¤§à¤¾", "à¤œà¤°à¥€", "à¤•à¤¾à¤°à¤£", "à¤¤à¤°à¥€à¤¹à¥€"],
                    "ur": ["Ø§ÙˆØ±", "Ù„ÛŒÚ©Ù†", "Ø¨Ú¾ÛŒ", "Ø§Ú¯Ø±Ú†Û", "Ú©ÛŒÙˆÙ†Ú©Û", "Ø¨ÛØ±Ø­Ø§Ù„"],
                    "gu": ["àª…àª¨à«‡", "àªªàª£", "àªªàª£", "àªœà«‹àª•à«‡", "àª•àª¾àª°àª£ àª•à«‡", "àª¤à«‡àª® àª›àª¤àª¾àª‚"],
                    "id": ["dan", "tapi", "juga", "walaupun", "karena", "namun"],
                    "fa": ["Ùˆ", "Ø§Ù…Ø§", "Ù‡Ù…Ú†Ù†ÛŒÙ†", "Ù‡Ø±Ú†Ù†Ø¯", "Ú†ÙˆÙ†", "Ø¨Ø§ Ø§ÛŒÙ† Ø­Ø§Ù„"],
                    "ms": ["dan", "tetapi", "juga", "walaupun", "kerana", "namun"],
                    "pa": ["à¨…à¨¤à©‡", "à¨ªà¨°", "à¨µà©€", "à¨¹à¨¾à¨²à¨¾à¨‚à¨•à¨¿", "à¨•à¨¿à¨‰à¨‚à¨•à¨¿", "à¨«à¨¿à¨° à¨µà©€"],
                    "kn": ["à²®à²¤à³à²¤à³", "à²†à²¦à²°à³†", "à²¸à²¹", "à²¹à³‡à²—à²¿à²¦à³à²¦à²°à³‚", "à²à²•à³†à²‚à²¦à²°à³†", "à²†à²¦à²¾à²—à³à²¯à³‚"],
                    "or": ["à¬à¬¬à¬‚", "à¬•à¬¿à¬¨à­à¬¤à­", "à¬®à¬§à­à­Ÿ", "à¬¯à¬¦à¬¿à¬“", "à¬•à¬¾à¬°à¬£", "à¬¤à¬¥à¬¾à¬ªà¬¿"],
                    "ml": ["à´‰à´‚", "à´ªà´•àµà´·àµ‡", "à´•àµ‚à´Ÿà´¾à´¤àµ†", "à´Žà´™àµà´•à´¿à´²àµà´‚", "à´Žà´¨àµà´¤àµà´•àµŠà´£àµà´Ÿàµ", "à´Žà´¨àµà´¨à´¿à´°àµà´¨àµà´¨à´¾à´²àµà´‚"],
                    "su": ["jeung", "tapi", "ogÃ©", "sanajan", "sabab", "tapi"],
                    "ha": ["da", "amma", "kuma", "ko da yake", "domin", "duk da haka"],
                    "yo": ["ati", "á¹£ugbá»n", "páº¹lupáº¹lu", "bi o tiláº¹ jáº¹ pe", "nitori", "sibáº¹sibáº¹"],
                    "ig": ["na", "ma", "á»zá»kwa", "á» bá»¥rá»¥godá»‹", "n'ihi na", "n'agbanyeghá»‹ nke ahá»¥"],
                    "zu": ["futhi", "kodwa", "futhi", "nakuba", "ngoba", "nokho"],
                    "am": ["áŠ¥áŠ“", "áŠáŒˆáˆ­ áŒáŠ•", "áŠ¥áŠ•á‹²áˆáˆ", "á‰¢áˆ†áŠ•áˆ", "áˆµáˆˆáˆáŠ•", "áŠáŒˆáˆ­ áŒáŠ•"],
                    "qu": ["hinallataq", "ichaqa", "chaymantapas", "yachaykuchus", "imanasqam", "ichaqa"],
                    "ay": ["ukhamarak", "ukampinsa", "ukhamat", "jichhax", "kawkisa", "ukampinsa"],
                    "gn": ["ha", "upÃ©icharÃµ", "avei", "ha'eÃ±Ã³i", "mba'Ã©re", "upÃ©icharÃµ"],
                    "ht": ["ak", "men", "tou", "byenke", "paske", "kanmenm"],
                    "mn": ["Ð±Ð°Ñ", "Ð³ÑÑ…Ð´ÑÑ", "Ð¼Ó©Ð½", "Ð³ÑÑÑÐ½ Ñ…ÑÐ´Ð¸Ð¹ Ñ‡", "ÑƒÑ‡Ð¸Ñ€ Ð½ÑŒ", "Ð³ÑÑÑÐ½ Ñ…ÑÐ´Ð¸Ð¹ Ñ‡"],
                    "my": ["á€”á€²á€·", "á€’á€«á€•á€±á€™á€šá€·á€º", "á€œá€Šá€ºá€¸", "á€á€€á€šá€ºá€œá€­á€¯á€·", "á€˜á€¬á€€á€¼á€±á€¬á€„á€·á€ºá€œá€²", "á€’á€«á€•á€±á€™á€šá€·á€º"],
                    "lo": ["à»àº¥àº°", "à»àº•à»ˆ", "àºà»", "à»€àº–àº´àº‡à»àº¡à»ˆàº™àº§à»ˆàº²", "à»€àºžàº²àº°", "à»€àº–àº´àº‡à»àº¡à»ˆàº™àº§à»ˆàº²"],
                    "km": ["áž“áž·áž„", "áž”áŸ‰áž»áž“áŸ’ážáŸ‚", "áž€áŸ", "áž‘áŸ„áŸ‡áž”áž¸áž‡áž¶", "áž–áž¸áž–áŸ’ážšáŸ„áŸ‡", "áž‘áŸ„áŸ‡áž”áž¸áž‡áž¶"],
                    "ceb": ["ug", "apan", "usab", "bisag", "tungod", "apan"],
                    "ilo": ["ken", "ngem", "pay", "nupay", "ta", "ngem"],
                    "mg": ["ary", "fa", "koa", "na", "satria", "na"],
                    "af": ["en", "maar", "ook", "alhoewel", "omdat", "tog"],
                    "sw": ["na", "lakini", "pia", "ingawa", "kwa sababu", "hata hivyo"],
                    "so": ["iyo", "laakiin", "sidoo kale", "inkastoo", "sababta oo ah", "si kastaba ha ahaatee"],
                    "rw": ["na", "ariko", "kandi", "nubwo", "kubera", "ariko"],
                    "st": ["le", "empa", "hape", "leha", "hobane", "leha"],
                    "xh": ["ne", "kodwa", "kwakhona", "nokuba", "ngokuba", "nokuba"],
                    "tn": ["le", "fa", "gape", "le fa", "ka gore", "le fa"],
                }
                res.append(random.choice(connectors.get(lang, connectors["es"])))

        if not res[-1].endswith((".", "!", "?")):
            res[-1] += "."

        final_text = " ".join(res)

        # Prefijo por intenciÃ³n detectada
        intent = detect_intent(prompt)
        intent_prefixes = {
            "greeting":  ["Â¡Hola! ", "Â¡Buenas! ", "Â¡Hey! ", "Â¡QuÃ© tal! "],
            "farewell":  ["Â¡Hasta luego! ", "Â¡CuÃ­date! ", "Â¡Nos vemos! "],
            "thanks":    ["De nada. ", "Con gusto. ", "Para eso estoy. "],
            "complaint": ["Entiendo. ", "Veamos ese problema. ", "Te ayudo. "],
            "question":  ["Sobre eso... ", "DÃ©jame pensar. ", "Interesante pregunta. "],
        }
        localized_intent_prefixes = {
            "en": {
                "greeting":  ["Hello! ", "Hi! ", "Hey! "],
                "farewell":  ["See you! ", "Take care! "],
                "thanks":    ["You're welcome. ", "Glad to help. "],
                "complaint": ["I understand. ", "Let's look at that. "],
                "question":  ["About that... ", "Let me think. "],
            },
            "fr": {
                "greeting":  ["Bonjour ! ", "Salut ! "],
                "farewell":  ["Ã€ bientÃ´t ! ", "Prends soin de toi ! "],
                "thanks":    ["Avec plaisir. ", "Je t'en prie. "],
                "complaint": ["Je comprends. ", "Regardons Ã§a. "],
                "question":  ["Ã€ ce sujet... ", "Je rÃ©flÃ©chis. "],
            },
            "de": {
                "greeting":  ["Hallo! ", "Guten Tag! "],
                "farewell":  ["Bis spÃ¤ter! ", "Pass auf dich auf! "],
                "thanks":    ["Gern geschehen. ", "Gerne. "],
                "complaint": ["Ich verstehe. ", "Schauen wir uns das an. "],
                "question":  ["Dazu... ", "Ich denke nach. "],
            },
            "pt": {
                "greeting":  ["OlÃ¡! ", "Oi! "],
                "farewell":  ["AtÃ© logo! ", "Cuida-te! "],
                "thanks":    ["De nada. ", "Com prazer. "],
                "complaint": ["Entendo. ", "Vamos ver isso. "],
                "question":  ["Sobre isso... ", "Deixa-me pensar. "],
            },
        }
        if lang in localized_intent_prefixes:
            intent_prefixes = localized_intent_prefixes[lang]
        if intent in intent_prefixes:
            final_text = random.choice(intent_prefixes[intent]) + final_text

        add_web_log("IA", f"[ctx={chat_id}][{intent}] '{prompt[:20]}' â†’ '{final_text[:35]}'")

        if self.mood == "friendly":
            final_text += f" {random.choice(['ðŸ˜Š', 'âœ¨', 'ðŸ™Œ', 'ðŸŒ™'])}"
        elif self.mood == "sarcastic":
            if lang != "es":
                return final_text
            final_text = f"Bueno, {final_text.lower()} {random.choice(['... o eso creo.', 'ðŸ™„', 'Â¡Genial!', 'Vaya tela.'])}"
        elif self.mood == "philosophical":
            if lang != "es":
                return final_text
            final_text = f"Reflexionando: {final_text} Â¿No es fascinante?"
        elif self.mood == "cyberpunk":
            final_text = f"[CORE]: {final_text.upper()} // LINK_ACTIVE"

        markov_result = final_text

        # â”€â”€ CAPA 2: Ollama â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if ai_preference != "markov":
            use_ollama = (ai_preference == "ollama") or (USE_EXTERNAL_LLM and LLM_PROVIDER == "ollama")
            if use_ollama:
                system_instruction = self.build_multilingual_instruction(prompt, current_mood, memory_context, lang=lang)
                ollama_resp = self._call_ollama(prompt, system_instruction)
                if ollama_resp:
                    self.learn(ollama_resp, source="Ollama")
                    add_web_log("IA", f"[Ollama] respondiÃ³ para '{prompt[:30]}'")
                    return ollama_resp
                add_web_log("IA", "[Ollama] sin respuesta â€” usando Markov.")

            # â”€â”€ CAPA 3: Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            use_gemini = (ai_preference == "gemini") or (USE_EXTERNAL_LLM and LLM_PROVIDER == "gemini")
            if use_gemini:
                system_instruction = self.build_multilingual_instruction(prompt, current_mood, memory_context, lang=lang)
                gemini_resp = self._call_gemini(prompt, system_instruction)
                if gemini_resp:
                    self.learn(gemini_resp, source="Gemini")
                    add_web_log("IA", f"[Gemini] respondiÃ³ para '{prompt[:30]}'")
                    return gemini_resp
                add_web_log("IA", "[Gemini] sin respuesta â€” usando Markov.")

        add_web_log("IA", f"[Markov] respondiÃ³ para '{prompt[:30]}'")
        return markov_result

    def force_feed(self, chats_history):
        add_web_log("INFO", "Iniciando alimentaciÃ³n forzada desde el historial histÃ³rico...")
        count = 0
        for chat_id in chats_history:
            for msg in chats_history[chat_id]:
                text = msg.get("text", "")
                if not isinstance(text, str): text = str(text) if text is not None else ""
                if text and not text.startswith("/"):
                    self.learn(text)
                    count += 1
        add_web_log("SUCCESS", f"AlimentaciÃ³n forzada completada. {count} mensajes re-procesados.")

    def get_stats(self):
        try:
            with self.brain_lock:
                keywords_snapshot = dict(self.brain["keywords"])
            words_count = len(keywords_snapshot)
            connections = sum(sum(v.values()) if isinstance(v, Counter) else len(v) for v in keywords_snapshot.values())
        except RuntimeError:
            # Fallback si aÃºn hay conflicto
            words_count = len(self.brain.get("keywords", {}))
            connections = 0
        elapsed = (time.time() - self.start_time) / 60 # Minutos
        rate = self.session_words / elapsed if elapsed > 0 else 0
        
        # EstimaciÃ³n de madurez (meta 1.000.000 palabras)
        target = 1000000
        milestone_minutes = 60
        remaining = max(0, target - words_count)
        est_minutes = (remaining / rate) if rate > 0 else 0
        required_rate = remaining / milestone_minutes if remaining > 0 else 0
        progress = min(100, (words_count / target) * 100) if target > 0 else 0
        milestone_status = "COMPLETADO" if words_count >= target else (
            "EN RITMO 1H" if rate >= required_rate and rate > 0 else "ACELERAR APRENDIZAJE"
        )
        
        status = "BebÃ© (Aprendiendo)"
        if words_count >= 1000000: status = "Singularidad Neural (1M)"
        elif words_count > 100000: status = "Dios Neuronal (Omnisciente)"
        elif words_count > 50000: status = "Eminencia (Superior)"
        elif words_count > 10000: status = "Madura (Estable)"
        elif words_count > 1000: status = "Juvenil (Curiosa)"
        billion_remaining = max(0, NEURAL_BILLION_TARGET - words_count)
        billion_required_rate = billion_remaining / NEURAL_BILLION_DEADLINE_MIN if billion_remaining > 0 else 0
        billion_progress = min(100, (words_count / NEURAL_BILLION_TARGET) * 100) if NEURAL_BILLION_TARGET else 0
        balancer_cfg = db.get("IA_LOAD_BALANCER", {})
        per_worker_rate = max(1, int(balancer_cfg.get("per_worker_rate", 2500)))
        max_workers = max(1, int(balancer_cfg.get("max_workers", 8)))
        needed_workers = max(0, int((billion_required_rate + per_worker_rate - 1) // per_worker_rate))
        planned_workers = min(max_workers, needed_workers)
        billion_status = "COMPLETADO" if words_count >= NEURAL_BILLION_TARGET else (
            "EN RITMO 12H" if rate >= billion_required_rate and rate > 0 else "REQUIERE BALANCEADOR"
        )
        self.learning_balancer["last_plan"] = {
            "needed_workers": needed_workers,
            "planned_workers": planned_workers,
            "max_workers": max_workers,
            "per_worker_rate": per_worker_rate
        }
        
        return {
            "words": words_count,
            "connections": connections,
            "rate": f"{rate:.2f} p/min",
            "milestone_target": target,
            "milestone_deadline_min": milestone_minutes,
            "milestone_progress": f"{progress:.2f}%",
            "milestone_remaining": remaining,
            "milestone_required_rate": f"{required_rate:.2f} p/min",
            "milestone_status": milestone_status,
            "billion_target": NEURAL_BILLION_TARGET,
            "billion_deadline_min": NEURAL_BILLION_DEADLINE_MIN,
            "billion_progress": f"{billion_progress:.8f}%",
            "billion_remaining": billion_remaining,
            "billion_required_rate": f"{billion_required_rate:.2f} p/min",
            "billion_status": billion_status,
            "load_balancer": self.learning_balancer,
            "est_maturity": f"{status} | {est_minutes:.1f} min" if words_count < target else status
        }

    def send_master_report(self, title="Reporte de Inteligencia"):
        """EnvÃ­a un resumen detallado del estado de la IA al Administrador Maestro."""
        if not MASTER_ID: return
        stats = self.get_stats()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        
        # Recuperar estadÃ­sticas de hace 24h para el reporte diario
        history = db.get("IA_STATS_24H", {"words": stats['words'], "connections": stats['connections']})
        growth_words = stats['words'] - history.get("words", stats['words'])
        growth_conn = stats['connections'] - history.get("connections", stats['connections'])
        
        growth_text = ""
        if "DIARIO" in title:
            growth_text = (
                f"ðŸ“ˆ *EvoluciÃ³n 24h:*\n"
                f"   â”” Neuronas: `+{growth_words}`\n"
                f"   â”” Sinapsis: `+{growth_conn}`\n"
                f"--------------------------------\n"
            )
            # Actualizar historial para maÃ±ana
            db.set("IA_STATS_24H", {"words": stats['words'], "connections": stats['connections']})

        report = (
            f"ðŸ“Š *{title}*\n"
            f"ðŸ“… Fecha: `{now}`\n"
            f"--------------------------------\n"
            f"ðŸ§  *Neuronas:* `{stats['words']}`\n"
            f"ðŸ”— *Sinapsis:* `{stats['connections']}`\n"
            f"âš¡ *Velocidad:* `{stats['rate']}`\n"
            f"ðŸŽ“ *Estado:* `{stats['est_maturity']}`\n"
            f"--------------------------------\n"
            f"{growth_text}"
            f"ðŸ“š *Top Fuentes:* {', '.join([s['name'] for s in self.get_top_sources()[:3]])}\n"
            f"ðŸŒ *Idiomas:* {len(db.get('IA_LANG_COUNTS', {}))} detectados\n"
            f"ðŸ›¡ï¸ *Seguridad:* Escudo Neural Activo\n"
            f"--------------------------------\n"
            f"ðŸŒ™ _Moon Multibot Intelligence System_"
        )
        
        try:
            # Usamos proxy_bot para enviar el reporte
            proxy_bot.api_call("sendMessage", {"chat_id": MASTER_ID, "text": report, "parse_mode": "Markdown"})
        except Exception as e:
            add_web_log("ERROR", f"Fallo al enviar reporte maestro: {e}")

    def get_top_sources(self):
        """Calcula las fuentes mÃ¡s influyentes e incluye una muestra de palabras."""
        sources = {}
        source_words = {}
        for w, s in self._sources_cache.items():
            sources[s] = sources.get(s, 0) + 1
            if s not in source_words: source_words[s] = []
            if len(source_words[s]) < 15: # Muestra de 15 palabras
                source_words[s].append(w)
                
        sorted_s = sorted(sources.items(), key=lambda x: x[1], reverse=True)
        return [{"name": k, "count": v, "words": source_words.get(k, [])} for k, v in sorted_s]
        
        eta = "Madura (Estable)"
        if est_minutes > 0:
            eta = str(datetime.timedelta(minutes=int(est_minutes)))

        return {
            "words": words_count, 
            "connections": connections,
            "rate": f"{round(rate, 2)} p/min",
            "est_maturity": eta
        }

    def search_web(self, query):
        """Buscador Neural via DuckDuckGo Instant Answer API (sin scraping, sin bloqueos)."""
        try:
            headers = {'User-Agent': 'MoonBot/1.0'}
            encoded = requests.utils.quote(query)
            url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
            r = requests.get(url, headers=headers, timeout=8)
            if r.status_code == 200:
                data = r.json()
                abstract = data.get("AbstractText", "").strip()
                if abstract:
                    self.learn(abstract, source="DuckDuckGo")
                    return abstract[:400]
                topics = [t.get("Text", "") for t in data.get("RelatedTopics", [])
                          if isinstance(t, dict) and t.get("Text")]
                if topics:
                    result = " | ".join(topics[:3])[:400]
                    self.learn(result, source="DuckDuckGo")
                    return result
            return "No encontrÃ© datos relevantes para esa bÃºsqueda."
        except Exception as e:
            add_web_log("ERROR", f"search_web error: {str(e)}")
            return "Error de conexiÃ³n con el buscador."

ia_nativa = MoonCoreIA()


def _tdlib_on_message(msg: dict):
    """Handler de mensajes recibidos via TDLib userbot."""
    if not tdlib_client or not tdlib_client.userbot_enabled:
        return

    chat_id = msg["chat_id"]
    user_id = msg["user_id"]
    text = msg.get("text", "").strip()
    message_id = msg["message_id"]
    is_private = msg["is_private"]
    me_id = msg.get("me_id")
    me_username = msg.get("me_username", "")
    cid = str(chat_id)

    # En grupos: solo responder si hay menciÃ³n directa, respuesta a nuestro mensaje
    # o el texto empieza con /
    if not is_private:
        mentioned = me_username and f"@{me_username}".lower() in text.lower()
        is_command = text.startswith("/")
        is_reply_to_me = False
        if msg.get("reply_to_message_id") and me_id:
            is_reply_to_me = True
        if not (mentioned or is_command or is_reply_to_me):
            return

    if not text:
        return

    uid = str(user_id)
    add_web_log("TDLIB", f"Mensaje userbot: [{cid}] uid={uid} â†’ {text[:60]}")
    _append_chat_hist(cid, {
        "time": datetime.datetime.now().strftime("%H:%M"),
        "sender": uid,
        "uid": uid,
        "text": text[:1000],
        "media": None,
    })

    # Comandos bÃ¡sicos
    t_lower = text.lower().strip()
    if t_lower in ("/start", "/help"):
        reply = "ðŸŒ™ *Moon Multibot Userbot activo.*\nPuede responder mensajes y aprender mediante TDLib."
        tdlib_client.send_message(chat_id, reply, reply_to_message_id=message_id)
        return

    if t_lower == "/tdstatus":
        st = tdlib_client.get_status()
        reply = f"TDLib: {st['auth_state']} | Userbot: {'ON' if st['userbot_enabled'] else 'OFF'}"
        tdlib_client.send_message(chat_id, reply, reply_to_message_id=message_id)
        return

    # Respuesta con IA nativa
    clean_text = text
    if me_username:
        clean_text = clean_text.replace(f"@{me_username}", "").strip()

    try:
        response = ia_nativa.generate(clean_text)
    except Exception:
        response = ""

    if response:
        tdlib_client.send_message(chat_id, response, reply_to_message_id=message_id)
        _append_chat_hist(cid, {
            "time": datetime.datetime.now().strftime("%H:%M"),
            "sender": "TDLib-Bot",
            "uid": str(me_id or "tdlib"),
            "text": response[:1000],
            "media": None,
        })

    # Aprendizaje (mismo flujo que el bot normal)
    if not listen_mode:
        try:
            ia_nativa.learn(clean_text)
        except Exception:
            pass


if tdlib_client:
    tdlib_client.on_message = _tdlib_on_message


# ============ Proxies MTProto por cercanía (comando /proxy de CintiaBot) ============
import math as _pmath

PROXY_API_URL = os.environ.get(
    "MTPROTO_PROXY_API", "http://localhost:3001/mtproto-proxies"
)

# Idioma de Telegram (language_code) -> (país, lat, lon) aproximado del usuario.
LANG_LOC = {
    "es": ("ES", 40.4, -3.7), "en": ("US", 39.8, -98.6), "fa": ("IR", 32.4, 53.7),
    "ru": ("RU", 55.75, 37.6), "ar": ("SA", 24.7, 46.7), "zh": ("CN", 39.9, 116.4),
    "tr": ("TR", 39.0, 35.2), "uk": ("UA", 50.45, 30.5), "pt": ("BR", -14.2, -51.9),
    "de": ("DE", 51.1, 10.4), "fr": ("FR", 46.2, 2.2), "it": ("IT", 41.9, 12.5),
    "hi": ("IN", 22.0, 79.0), "ur": ("PK", 30.4, 69.3), "id": ("ID", -2.5, 118.0),
    "vi": ("VN", 14.1, 108.3), "th": ("TH", 15.0, 101.0), "my": ("MM", 21.9, 95.9),
    "bn": ("BD", 23.7, 90.4), "az": ("AZ", 40.1, 47.6), "uz": ("UZ", 41.4, 63.6),
    "be": ("BY", 53.7, 27.9), "ka": ("GE", 42.3, 43.4), "hy": ("AM", 40.1, 45.0),
    "kk": ("KZ", 48.0, 66.9), "pl": ("PL", 51.9, 19.1), "nl": ("NL", 52.1, 5.3),
    "sv": ("SE", 60.1, 18.6), "fi": ("FI", 64.0, 26.0), "ja": ("JP", 36.2, 138.3),
    "ko": ("KR", 35.9, 127.8), "ro": ("RO", 45.9, 24.9), "el": ("GR", 39.1, 21.8),
    "he": ("IL", 31.5, 34.8), "cs": ("CZ", 49.8, 15.5), "hu": ("HU", 47.2, 19.5),
    "ku": ("IQ", 33.2, 43.7), "ps": ("AF", 33.9, 67.7), "tk": ("TM", 38.9, 59.6),
    "tg": ("TJ", 38.9, 71.3), "ky": ("KG", 41.2, 74.8),
}
# País -> centroide (para language_code con región: en-US, pt-BR, es-MX...).
COUNTRY_LOC = {
    "ES": (40.4, -3.7), "US": (39.8, -98.6), "IR": (32.4, 53.7), "RU": (55.75, 37.6),
    "MX": (23.6, -102.5), "AR": (-38.4, -63.6), "CO": (4.6, -74.1), "BR": (-14.2, -51.9),
    "GB": (54.0, -2.0), "DE": (51.1, 10.4), "FR": (46.2, 2.2), "CN": (39.9, 116.4),
    "IN": (22.0, 79.0), "PK": (30.4, 69.3), "TR": (39.0, 35.2), "UA": (50.45, 30.5),
    "SA": (24.7, 46.7), "AE": (24.0, 54.0), "EG": (26.8, 30.8), "VE": (6.4, -66.6),
}


def _haversine(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = _pmath.radians(la1), _pmath.radians(la2)
    dphi = _pmath.radians(la2 - la1)
    dl = _pmath.radians(lo2 - lo1)
    h = _pmath.sin(dphi / 2) ** 2 + _pmath.cos(p1) * _pmath.cos(p2) * _pmath.sin(dl / 2) ** 2
    return 2 * 6371.0 * _pmath.asin(min(1.0, _pmath.sqrt(h)))


def _flag(cc):
    if not cc or len(cc) != 2:
        return "🌐"
    try:
        return chr(0x1F1E6 + ord(cc[0].upper()) - 65) + chr(0x1F1E6 + ord(cc[1].upper()) - 65)
    except Exception:
        return "🌐"


def user_location_from_lang(language_code):
    """(cc, (lat,lon)) a partir del idioma de Telegram, o (None, None)."""
    if not language_code:
        return None, None
    code = language_code.strip().lower()
    base = code.split("-")[0]
    region = code.split("-")[1].upper() if "-" in code else None
    if region and region in COUNTRY_LOC:
        return region, COUNTRY_LOC[region]
    if base in LANG_LOC:
        cc, lat, lon = LANG_LOC[base]
        return cc, (lat, lon)
    return None, None


_proxy_cache = {"data": None, "ts": 0.0}


def fetch_proxies():
    """Lista de proxies desde la API (cacheada 60 s en el bot)."""
    if _proxy_cache["data"] and time.time() - _proxy_cache["ts"] < 60:
        return _proxy_cache["data"]
    try:
        r = requests.get(PROXY_API_URL, timeout=15)
        r.raise_for_status()
        _proxy_cache["data"] = r.json()
        _proxy_cache["ts"] = time.time()
    except Exception as e:
        add_web_log("ERROR", f"[PROXY] No se pudo obtener la lista: {e}")
    return _proxy_cache["data"]


# ---- Recomendación de proxies (usuarios) + aprobación (master) ----
import socket as _socket

COMMUNITY_TOKEN = os.environ.get("MTPROTO_COMMUNITY_TOKEN", "set-me-in-env")
COMMUNITY_POST_URL = os.environ.get(
    "MTPROTO_COMMUNITY_POST", "http://localhost:3001/mtproto-proxies/community"
)
PROXY_LINK_RE = re.compile(
    r"(?:tg://proxy|t\.me/proxy|https?://t\.me/proxy)\?server=([^&\s]+)&(?:amp;)?port=(\d+)&(?:amp;)?secret=([0-9a-fA-F]+)",
    re.I,
)


def parse_proxy_link(text):
    """(server, port, secret) de un enlace MTProto, o None."""
    if not text:
        return None
    m = PROXY_LINK_RE.search(text)
    if not m:
        return None
    return m.group(1).rstrip(".,;").strip(), int(m.group(2)), m.group(3)


def tcp_alive(host, port, timeout=4):
    try:
        with _socket.create_connection((host, int(port)), timeout=timeout):
            return True
    except Exception:
        return False


def submit_community_proxy(server, port, secret, by=""):
    """Publica un proxy aprobado en la API. Devuelve (ok, info)."""
    try:
        r = requests.post(COMMUNITY_POST_URL,
                          json={"server": server, "port": port, "secret": secret, "by": by},
                          headers={"X-Token": COMMUNITY_TOKEN}, timeout=12)
        j = r.json()
        return bool(j.get("ok")), j
    except Exception as e:
        return False, {"error": str(e)}


class MoonBot:
    def __init__(self, token):
        self.token, self.url, self.session, self.plugins = token, f"https://api.telegram.org/bot{token}/", requests.Session(), []
        self.db = db
        self.ia = ia_nativa
        self.ia_nativa = ia_nativa
        threading.Thread(target=self.ia.deep_dream_worker, daemon=True).start()

        self.ia.load_brain()
        me = self.api_call("getMe")
        self.bot_username = me.get("result", {}).get("username", "MoonBot")
        self.bot_id = me.get("result", {}).get("id")
        self.telegram_events = TelegramEventStore(db, add_web_log)
        self.invoked_ai = InvokedAIService(ia_nativa, db, ban_manager, check_cas_status, add_web_log, self.bot_username)
        self.last_msg_id = None
        self.last_media_hash = None
        if not os.path.exists("downloads"): os.makedirs("downloads")

        # TDLib bot client (opcional) â€” autentica con bot token, sesiÃ³n propia
        self._tdlib = None
        if TDLIB_API_ID and TDLIB_API_HASH:
            bot_dir = f"tdlib_data/bot_{bot_public_id(token)}"
            self._tdlib = TDLibClient(
                TDLIB_API_ID, TDLIB_API_HASH, db,
                log_func=add_web_log,
                bot_token=token,
                db_dir=bot_dir,
            )
            self._tdlib.start()
            add_web_log("TDLIB", f"TDLib bot iniciado para @{self.bot_username}")

    def call_api(self, m, p=None, silent=False):
        method = normalize_method(m)
        data = telegram_api_call(self.session, self.url, method, p, timeout=35)
        if not data.get("ok") and not silent:
            add_web_log("ERROR", f"Telegram API Fail ({method}, Bot API {TELEGRAM_BOT_API_VERSION}): {data.get('description')}")
        return data

    def send_msg(self, chat_id, text, parse_mode="Markdown", business_connection_id=None):
        result = None
        safe_text = _repair_mojibake(text)

        # Intentar envÃ­o via TDLib si estÃ¡ listo y no es mensaje de business
        if self._tdlib and self._tdlib.is_ready and not business_connection_id:
            try:
                tdlib_result = self._tdlib.send_message(
                    int(chat_id), safe_text, parse_mode=parse_mode
                )
                if tdlib_result.get("@type") == "message":
                    result = {"ok": True, "result": tdlib_result}
            except Exception as e:
                add_web_log("ERROR", f"TDLib send_msg fallÃ³, usando Bot API: {e}")

        # Fallback a Bot API HTTP
        if result is None:
            payload = {"chat_id": chat_id, "text": safe_text, "parse_mode": parse_mode}
            if business_connection_id:
                payload["business_connection_id"] = business_connection_id
            result = self.call_api("sendMessage", payload)
            # Si Telegram rechaza las entidades Markdown, reintenta sin parse_mode
            if result and not result.get("ok") and "parse entities" in str(result.get("description", "")).lower():
                payload.pop("parse_mode", None)
                result = self.call_api("sendMessage", payload)

        cid_str = str(chat_id)
        if cid_str in global_chat_history:
            _append_chat_hist(cid_str, {
                "time": datetime.datetime.now().strftime("%H:%M"),
                "sender": "Bot",
                "uid": self.bot_username,
                "text": (safe_text or "")[:1000],
                "media": None
            })
        return result

    def send_message_draft(self, chat_id, text, message_thread_id=None):
        payload = {"chat_id": chat_id, "text": text}
        if message_thread_id is not None:
            payload["message_thread_id"] = message_thread_id
        return self.api_call("sendMessageDraft", payload)

    def answer_inline_query(self, inline_query_id, results, cache_time=2, is_personal=True):
        return self.api_call("answerInlineQuery", {
            "inline_query_id": inline_query_id,
            "results": results,
            "cache_time": cache_time,
            "is_personal": is_personal,
        })

    def analyze_image(self, path):
        """Neural Perception Engine (NPHE-I) - 100% Local & Open Source"""
        try:
            size = os.path.getsize(path)
            with open(path, 'rb') as f:
                data = f.read(10240) # Leer los primeros 10KB para anÃ¡lisis de cabecera
                
                res = "Desconocido"
                fmt = "Binario"
                details = []

                # PNG
                if data.startswith(b'\x89PNG\r\n\x1a\n'):
                    w, h = struct.unpack('>LL', data[16:24])
                    fmt, res = "PNG (Lossless)", f"{w}x{h}"
                # JPEG
                elif data.startswith(b'\xff\xd8'):
                    fmt = "JPEG (Compressed)"
                    f.seek(0)
                    content = f.read(15000)
                    for i in range(len(content)-8):
                        if content[i:i+2] == b'\xff\xc0': # SOF0
                            h, w = struct.unpack('>HH', content[i+5:i+9])
                            res = f"{w}x{h}"
                            break
                # WEBP
                elif data.startswith(b'RIFF') and data[8:12] == b'WEBP':
                    fmt = "WebP (Modern)"
                    if data[12:16] == b'VP8 ':
                        w_h = struct.unpack('<HH', data[26:30])
                        res = f"{w_h[0] & 0x3FFF}x{w_h[1] & 0x3FFF}"
                # GIF
                elif data.startswith(b'GIF87a') or data.startswith(b'GIF89a'):
                    w, h = struct.unpack('<HH', data[6:10])
                    fmt, res = "GIF (Animado)", f"{w}x{h}"

                if res != "Desconocido":
                    # AnÃ¡lisis de Complejidad (EntropÃ­a HeurÃ­stica)
                    w_val = int(res.split('x')[0])
                    h_val = int(res.split('x')[1])
                    pixels = w_val * h_val
                    ratio = size / max(pixels, 1)
                    
                    if ratio > 0.5: details.append("Alta Complejidad (FotografÃ­a)")
                    elif ratio < 0.05: details.append("Baja Complejidad (IlustraciÃ³n/Logo)")
                    else: details.append("Complejidad Media")

                    # HeurÃ­stica CromÃ¡tica (Muestreo binario)
                    sample = data[2000:5000] # Muestra del cuerpo del archivo
                    if sample:
                        avg_byte = sum(sample) / len(sample)
                        if avg_byte > 180: details.append("Tono Predominante: Brillante/Blanco")
                        elif avg_byte < 50: details.append("Tono Predominante: Oscuro/SombrÃ­o")
                        
                        # DetecciÃ³n de "Calidez" (HeurÃ­stica basada en distribuciÃ³n de bytes)
                        warm_count = sum(1 for b in sample if b > 150)
                        if warm_count > len(sample) * 0.4: details.append("Ambiente: CÃ¡lido/EnergÃ©tico")

                    return f"IA Perception: {fmt} {res}. {'. '.join(details)}."
                
                return f"PercepciÃ³n limitada ({size} bytes). Estructura no indexada."
        except Exception as e:
            return f"Fallo en PercepciÃ³n Neural: {str(e)}"

    def analyze_video(self, path):
        """Neural Perception Engine (NPHE-V) - TelemetrÃ­a de Video Local"""
        try:
            size = os.path.getsize(path)
            with open(path, 'rb') as f:
                data = f.read(50000)
                
                idx = data.find(b'mvhd')
                if idx != -1:
                    timescale = struct.unpack('>I', data[idx+12:idx+16])[0]
                    duration = struct.unpack('>I', data[idx+16:idx+20])[0]
                    if timescale > 0:
                        sec = round(duration / timescale, 2)
                        bitrate = round((size * 8) / (sec * 1024), 2) # kbps
                        
                        codec = "Desconocido"
                        if b'avc1' in data: codec = "H.264 (AVC)"
                        elif b'hvc1' in data: codec = "H.265 (HEVC)"
                        elif b'vp09' in data: codec = "VP9"
                        
                        return f"Video Analizado: {sec}s | Codec: {codec} | Bitrate: {bitrate} kbps. Integridad verificada."

                return f"Video detectado ({size} bytes). Metadatos encriptados o no estÃ¡ndar."
        except Exception as e:
            return f"Error en telemetrÃ­a de video: {str(e)}"

    def get_file_hash(self, path):
        """Genera una huella digital SHA-256 Ãºnica para cualquier archivo."""
        sha256_hash = hashlib.sha256()
        with open(path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def check_security_blacklist(self, file_hash, cid, uid, uname, caption="", visual_data=""):
        """DecisiÃ³n Unificada IA: EvalÃºa Riesgo (VT, CAS, IA Perception, Banned Words) y aplica sentencia."""
        if not db.get("NEURAL_SHIELD", True): return False
        
        # 1. RecopilaciÃ³n de Inteligencia
        vt_res = vt_mgr.scan_hash(file_hash)
        cas_banned = is_cas_banned(uid)
        v_low = (visual_data or "").lower()
        cap_low = (caption or "").lower()
        
        # 2. Sistema de PuntuaciÃ³n (Security Score)
        score = 0
        reasons = []
        
        # -- VirusTotal (40 pts por motor, max 100)
        vt_malicious = vt_res.get("malicious", 0) if vt_res.get("ok") else 0
        if vt_malicious > 0:
            score += min(100, vt_malicious * 40)
            reasons.append(f"VirusTotal Malware ({vt_malicious} motores)")
            
        # -- CAS Chat (80 pts)
        if cas_banned:
            score += 80
            reasons.append("CAS Global Blacklist")
            
        # -- IA Behavioral & Banned Words (30-50 pts)
        banned_words = ["porno", "xxx", "terrorismo", "isis", "bomba", "gore", "cp ", "pedofilo"]
        if any(w in cap_low for w in banned_words):
            score += 50
            reasons.append(f"Contenido Prohibido en Caption")
            
        # DetecciÃ³n de Estafas DinÃ¡mica (solo si coinciden varios tÃ©rminos)
        scam_words = ["nequi", "paypal", "scam", "estafa", "pago", "premio", "gana"]
        matches = [w for w in scam_words if w in cap_low]
        if len(matches) >= 2:
            score += 40
            reasons.append(f"PatrÃ³n de Estafa Detectado ({', '.join(matches)})")

        # 3. Registro del Evento de AuditorÃ­a
        security_event = {
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "hash": file_hash,
            "chat_id": cid,
            "chat_name": global_chat_names.get(cid, cid),
            "user": f"{uname} ({uid})",
            "score": score,
            "reasons": ", ".join(reasons) or "Limpio",
            "vt_status": "Malicious" if vt_malicious > 0 else "Clean",
            "cas_status": "Banned" if cas_banned else "Clear"
        }
        sec_logs = db.get("SECURITY_AUDIT_LOGS", [])
        sec_logs.append(security_event)
        db.set("SECURITY_AUDIT_LOGS", sec_logs[-300:])

        # 4. DecisiÃ³n Final: Umbral de ExpulsiÃ³n (Score >= 80)
        if score >= 80:
            add_web_log("SECURITY", f"ðŸš¨ DECISIÃ“N IA: Expulsando a {uname} por riesgo crÃ­tico ({score}/100). Razones: {security_event['reasons']}")
            scope = "global" if cas_banned else "local"
            source = "cas" if cas_banned else "neural_shield"
            self.apply_user_ban(cid, uid, uname, reason=security_event["reasons"], source=source, scope=scope, message_id=self.last_msg_id)
             
            # Notificar en el grupo
            self.send_msg(cid, f"âš–ï¸ **SENTENCIA IA:** {uname} ha sido expulsado.\n\nðŸ›¡ï¸ **Nivel de Riesgo:** `{score}/100`\nðŸ” **Motivos:** {security_event['reasons']}\n\nProtegiendo la integridad del nodo Moon.")
            return True

        # Blacklist Manual (Legacy)
        banned_hashes = db.get("BANNED_HASHES", [])
        if file_hash in banned_hashes:
            self.call_api("deleteMessage", {"chat_id": cid, "message_id": self.last_msg_id}, silent=True)
            self.send_msg(cid, "ðŸš« **ESCUDO:** Archivo bloqueado por lista negra manual.")
            return True

        return False
        
        is_banned_hash = file_hash in banned_hashes
        has_banned_caption = any(w in (caption or "").lower() for w in banned_words)

        # HeurÃ­stica Visual NPHE para Porno/Terrorismo
        has_suspicious_visual = False
        v_low = (visual_data or "").lower()
        if "ia perception" in v_low:
            # HeurÃ­stica Porno: FotografÃ­a + Ambiente CÃ¡lido (Posible piel/cuerpo) + Brillo alto
            if "fotografÃ­a" in v_low and "cÃ¡lido" in v_low and "brillante" in v_low:
                has_suspicious_visual = True
            # HeurÃ­stica Terrorismo/Gore: FotografÃ­a + Tono SombrÃ­o
            if "fotografÃ­a" in v_low and "oscuro/sombrÃ­o" in v_low:
                # Si es video y tiene bitrate muy bajo pero es sombrÃ­o, podrÃ­a ser material filtrado/gore
                if "bitrate" in v_low:
                    try:
                        br_match = re.search(r'(\d+\.?\d*) kbps', v_low)
                        if br_match and float(br_match.group(1)) < 200:
                            has_suspicious_visual = True
                    except: pass

        if is_banned_hash or has_banned_caption or has_suspicious_visual:
            reason = "Hash Blacklist" if is_banned_hash else ("PatrÃ³n Visual Sospechoso" if has_suspicious_visual else f"Contenido Prohibido ('{caption}')")
            add_web_log("SECURITY", f"ðŸš¨ ESCUDO ACTIVO: {uname} bloqueado por {reason}.")
            self.apply_user_ban(cid, uid, uname, reason=reason, source="neural_shield", scope="local", message_id=self.last_msg_id)
            self.send_msg(cid, f"ðŸš« **NEURAL SHIELD:** Contenido prohibido detectado por {reason}. Usuario expulsado permanentemente.")
            return True
        return False

    def sync_security_hashes(self):
        """Sincroniza la lista negra con bases de datos externas (URLs)."""
        urls = db.get("SECURITY_SYNC_URLS", [])
        if not urls: return
        new_hashes = []
        for url in urls:
            try:
                r = requests.get(url, timeout=10)
                if r.status_code == 200:
                    found = re.findall(r'[a-fA-F0-9]{64}', r.text)
                    new_hashes.extend(found)
                    add_web_log("SECURITY", f"SincronizaciÃ³n exitosa desde {url}: {len(found)} hashes encontrados.")
            except: pass
        if new_hashes:
            current = db.get("BANNED_HASHES", [])
            updated = list(set(current + new_hashes))
            db.set("BANNED_HASHES", updated)

    def purge_old_media(self, days):
        """Elimina archivos de la carpeta downloads mÃ¡s antiguos que X dÃ­as."""
        now = time.time()
        count = 0
        if os.path.exists("downloads"):
            for f in os.listdir("downloads"):
                f_path = os.path.join("downloads", f)
                if os.stat(f_path).st_mtime < now - (days * 86400):
                    try:
                        os.remove(f_path)
                        count += 1
                    except: pass
        if count > 0: add_web_log("CLEANUP", f"Purga automÃ¡tica: {count} archivos eliminados.")
    def load_plugins(self):
        self.plugins = []
        if os.path.exists("plugins"):
            for f in os.listdir("plugins"):
                if f.endswith(".py"):
                    try:
                        spec = importlib.util.spec_from_file_location(f[:-3], os.path.join("plugins", f))
                        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); self.plugins.append(m)
                    except: pass
    def api_call(self, m, p=None, silent=False):
        return self.call_api(m, p, silent)

    # --- MÃ©todos Core (Telegram Bot API) ---
    def send_document(self, chat_id, file_path, caption=""):
        try:
            with open(file_path, 'rb') as f:
                res = telegram_api_call(
                    self.session,
                    self.url,
                    "sendDocument",
                    {"chat_id": chat_id, "caption": caption},
                    files={"document": f},
                    timeout=60,
                )
                if not res.get("ok"):
                    add_web_log("ERROR", f"Telegram API Fail (sendDocument): {res.get('description')}")
                return res
        except Exception as e:
            return {"ok": False, "description": str(e)}

    def send_photo(self, cid, photo, caption=""):
        return self.api_call("sendPhoto", {"chat_id": cid, "photo": photo, "caption": caption, "parse_mode": "Markdown"})

    def send_audio(self, cid, audio, caption=""):
        return self.api_call("sendAudio", {"chat_id": cid, "audio": audio, "caption": caption})

    def send_video(self, cid, video, caption=""):
        return self.api_call("sendVideo", {"chat_id": cid, "video": video, "caption": caption})

    def send_location(self, cid, lat, lon):
        return self.api_call("sendLocation", {"chat_id": cid, "latitude": lat, "longitude": lon})

    def delete_msg(self, cid, mid):
        return self.api_call("deleteMessage", {"chat_id": cid, "message_id": mid}, silent=True)

    def edit_msg(self, cid, mid, text):
        return self.api_call("editMessageText", {"chat_id": cid, "message_id": mid, "text": text, "parse_mode": "Markdown"})

    def pin_msg(self, cid, mid):
        return self.api_call("pinChatMessage", {"chat_id": cid, "message_id": mid})

    def _invalidate_admin_cache(self, cid):
        db.set(f"ADMINS_{cid}", [])
        db.set(f"LAST_ADMIN_CHECK_{cid}", 0)

    def kick_user(self, cid, uid):
        self._invalidate_admin_cache(str(cid))
        return self.api_call("banChatMember", {"chat_id": cid, "user_id": uid})

    def get_managed_bot_token(self, bot_id):
        return self.api_call("getManagedBotToken", {"bot_id": bot_id})

    def replace_managed_bot_token(self, bot_id):
        return self.api_call("replaceManagedBotToken", {"bot_id": bot_id})

    def record_managed_bot_update(self, update):
        return self.telegram_events.record_managed_bot_update(update)

    def record_business_update(self, update):
        return self.telegram_events.record_business_update(update)

    def handle_inline_query(self, update):
        return self.invoked_ai.answer_inline_query(update, self.answer_inline_query)

    def handle_chosen_inline_result(self, update):
        return self.invoked_ai.record_chosen_inline_result(update)

    def handle_callback_query(self, update):
        cbq = update.get("callback_query")
        if not cbq:
            return False
        cbq_id = cbq["id"]
        data = cbq.get("data", "")
        user = cbq.get("from", {})
        uid = str(user.get("id", ""))
        uname = user.get("first_name", "Usuario")
        msg = cbq.get("message", {})
        cid = str(msg.get("chat", {}).get("id", "")) if msg else ""
        mid = str(msg.get("message_id", "")) if msg else ""

        # --- Pedir proxy (CintiaBot) ---
        if data == "req_proxy":
            self.answer_callback_query(cbq_id, "Buscando proxies…")
            if (self.bot_username or "").lower() == "cintiabot":
                self.handle_proxy_request(cid, uid, cbq.get("from", {}))
            return True

        # --- Aprobar/rechazar proxy recomendado (solo master) ---
        if data.startswith("appr_px:") or data.startswith("rej_px:"):
            self.handle_proxy_approval(cbq_id, cid, uid, data)
            return True

        # Juegos inline nativos en Telegram
        if data.startswith("moon_game:"):
            parts = data.split(":")
            action = parts[1] if len(parts) > 1 else ""

            if action == "menu":
                self._send_games_menu(cid, "🎮 **Panel de Juegos Moon**\nElige un minijuego:")
                self.answer_callback_query(cbq_id, "Panel abierto")
                return True

            if action == "coin":
                result = "Cara" if random.randint(0, 1) == 0 else "Cruz"
                self.send_msg(cid, f"🪙 Moneda: **{result}**")
                self.answer_callback_query(cbq_id, result)
                return True

            if action == "dice":
                val = random.randint(1, 6)
                self.send_msg(cid, f"🎲 Dado: **{val}**")
                self.answer_callback_query(cbq_id, f"Dado: {val}")
                return True

            if action == "guess_start":
                secret = random.randint(1, 10)
                db.set(f"GAME_GUESS_{cid}_{uid}", {"secret": secret, "tries": 0})
                kb = {
                    "inline_keyboard": [
                        [{"text": "1-3", "callback_data": "moon_game:guess:1:3"}, {"text": "4-7", "callback_data": "moon_game:guess:4:7"}, {"text": "8-10", "callback_data": "moon_game:guess:8:10"}],
                    ]
                }
                self.api_call("sendMessage", {"chat_id": cid, "text": "🔢 Adivina un número del 1 al 10.", "reply_markup": json.dumps(kb)})
                self.answer_callback_query(cbq_id, "Partida iniciada")
                return True

            if action == "guess" and len(parts) >= 4:
                g = db.get(f"GAME_GUESS_{cid}_{uid}", {})
                if not g:
                    self.answer_callback_query(cbq_id, "Primero inicia con Adivina 1-10", show_alert=True)
                    return True
                lo = int(parts[2]); hi = int(parts[3])
                guess = random.randint(lo, hi)
                g["tries"] = int(g.get("tries", 0)) + 1
                if guess == int(g.get("secret", -1)):
                    self.send_msg(cid, f"✅ {uname} acertó el número `{g['secret']}` en {g['tries']} intento(s).")
                    db.set(f"GAME_GUESS_{cid}_{uid}", {})
                else:
                    hint = "mayor" if guess < int(g.get("secret", 0)) else "menor"
                    db.set(f"GAME_GUESS_{cid}_{uid}", g)
                    self.send_msg(cid, f"❌ {uname} probó `{guess}`. Pista: es **{hint}**.")
                self.answer_callback_query(cbq_id, "Jugado")
                return True

            if action == "ttt_start":
                board = [" "] * 9
                state = {"owner": uid, "owner_name": uname, "board": board, "msg_id": mid, "chat_id": cid}
                db.set(f"GAME_TTT_{cid}_{uid}", state)
                self._ttt_render(cid, uid, uname)
                self.answer_callback_query(cbq_id, "Tres en raya iniciado")
                return True

            if action == "ttt" and len(parts) >= 3:
                idx = int(parts[2])
                state = db.get(f"GAME_TTT_{cid}_{uid}", {})
                if not state:
                    self.answer_callback_query(cbq_id, "Inicia una partida primero", show_alert=True)
                    return True
                board = state.get("board", [" "] * 9)
                if idx < 0 or idx > 8 or board[idx] != " ":
                    self.answer_callback_query(cbq_id, "Casilla inválida")
                    return True
                board[idx] = "X"
                winner = self._ttt_winner(board)
                if not winner and " " in board:
                    free = [i for i, v in enumerate(board) if v == " "]
                    board[random.choice(free)] = "O"
                    winner = self._ttt_winner(board)
                state["board"] = board
                db.set(f"GAME_TTT_{cid}_{uid}", state)
                self._ttt_render(cid, uid, uname)
                self.answer_callback_query(cbq_id, "Movimiento aplicado")
                return True

        handled = False
        for plugin in self.plugins:
            if hasattr(plugin, "handle_callback"):
                try:
                    if plugin.handle_callback(self, cid, uid, uname, data, cbq_id):
                        handled = True
                        break
                except Exception as e:
                    add_web_log("ERROR", f"Plugin callback error: {e}")

        if not handled:
            add_web_log("DEBUG", f"Callback no manejado: '{data}' de {uname} ({uid})")

        self.answer_callback_query(cbq_id)
        return True

    def _send_games_menu(self, cid, text):
        kb = {
            "inline_keyboard": [
                [{"text": "🪙 Moneda", "callback_data": "moon_game:coin"}, {"text": "🎲 Dado", "callback_data": "moon_game:dice"}],
                [{"text": "🔢 Adivina 1-10", "callback_data": "moon_game:guess_start"}],
                [{"text": "❌ Tres en raya", "callback_data": "moon_game:ttt_start"}],
            ]
        }
        self.api_call("sendMessage", {"chat_id": cid, "text": text, "parse_mode": "Markdown", "reply_markup": json.dumps(kb)})

    def _ttt_winner(self, b):
        wins = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
        for a, c, d in wins:
            if b[a] != " " and b[a] == b[c] and b[a] == b[d]:
                return b[a]
        return None

    def _ttt_render(self, cid, uid, uname):
        state = db.get(f"GAME_TTT_{cid}_{uid}", {})
        b = state.get("board", [" "] * 9)
        winner = self._ttt_winner(b)
        ended = winner is not None or " " not in b
        symbols = [x if x != " " else "·" for x in b]
        rows = [" | ".join(symbols[i:i+3]) for i in range(0, 9, 3)]
        text = "❌ **Tres en raya**\n\n" + "\n".join(rows)
        if ended:
            if winner == "X":
                text += f"\n\n✅ {uname} gana."
            elif winner == "O":
                text += "\n\n🤖 Moon gana."
            else:
                text += "\n\n🤝 Empate."
            db.set(f"GAME_TTT_{cid}_{uid}", {})
            self.send_msg(cid, text)
            return
        kb = {"inline_keyboard": []}
        for r in range(3):
            row = []
            for c in range(3):
                i = r * 3 + c
                cell = b[i]
                if cell == " ":
                    row.append({"text": "⬜", "callback_data": f"moon_game:ttt:{i}"})
                else:
                    row.append({"text": "❌" if cell == "X" else "⭕", "callback_data": "moon_game:menu"})
            kb["inline_keyboard"].append(row)
        self.api_call("sendMessage", {"chat_id": cid, "text": text, "parse_mode": "Markdown", "reply_markup": json.dumps(kb)})

    def handle_message_reaction(self, update):
        reaction = update.get("message_reaction")
        if not reaction:
            return False
        chat_id = str(reaction.get("chat", {}).get("id", ""))
        msg_id = reaction.get("message_id")
        user = reaction.get("user") or reaction.get("actor_chat") or {}
        uid = str(user.get("id", ""))
        new_reactions = [r.get("emoji", "") for r in reaction.get("new_reaction", []) if r.get("type") == "emoji"]
        old_reactions = [r.get("emoji", "") for r in reaction.get("old_reaction", []) if r.get("type") == "emoji"]
        if new_reactions:
            add_web_log("DEBUG", f"ReacciÃ³n {new_reactions} en msg {msg_id} de {uid} en {chat_id}")
        return True

    def handle_guest_update(self, update):
        return self.invoked_ai.answer_guest_update(
            update,
            self.send_msg,
            self.enforce_existing_ban,
            self.enforce_cas_ban,
        )

    def apply_user_ban(self, cid, uid, uname=None, reason="", source="runtime", scope="local", message_id=None, notify=False):
        uid_str = str(uid)
        cid_str = str(cid)
        uname = uname or uid_str
        if scope == "global":
            ban_manager.ban_user(uid_str, reason=reason, source=source)
        else:
            ban_manager.ban_local_user(cid_str, uid_str, reason=reason, source=source)

        if message_id:
            self.api_call("deleteMessage", {"chat_id": cid_str, "message_id": message_id}, silent=True)

        res = self.kick_user(cid_str, uid_str)
        if res.get("ok"):
            add_web_log("SECURITY", f"Ban {scope} aplicado a {uname} ({uid_str}) en {cid_str}: {reason}")
            if notify:
                self.send_msg(cid_str, f"ðŸš« **Usuario expulsado:** {uname}\nMotivo: `{reason}`")
        else:
            add_web_log("ERROR", f"Fallo aplicando ban {scope} a {uid_str} en {cid_str}: {res.get('description')}")
        return res

    def enforce_existing_ban(self, cid, uid, uname, message_id=None):
        if ban_manager.is_global_banned(uid):
            self.apply_user_ban(cid, uid, uname, reason="Global ban persistente", source="global_enforcer", scope="global", message_id=message_id)
            return True
        if ban_manager.is_local_banned(cid, uid):
            self.apply_user_ban(cid, uid, uname, reason="Local ban persistente", source="local_enforcer", scope="local", message_id=message_id)
            return True
        return False

    def enforce_cas_ban(self, cid, uid, uname, message_id=None):
        settings = db.get("GLOBAL_SETTINGS", {})
        if settings.get("cas_protection", "on") != "on":
            return False
        cas_status = check_cas_status(uid)
        if not cas_status.get("banned"):
            if not cas_status.get("ok"):
                add_web_log("WARNING", f"CAS no disponible para {uid}: {cas_status.get('description')}")
            return False
        reason = "CAS global blacklist"
        details = cas_status.get("result")
        if isinstance(details, dict) and details.get("offenses"):
            reason = f"CAS global blacklist ({details.get('offenses')} offense/s)"
        self.apply_user_ban(cid, uid, uname, reason=reason, source="cas", scope="global", message_id=message_id, notify=True)
        add_audit_log(f"Auto-ban CAS aplicado a {uname} ({uid}) en {cid}")
        return True

    def enforce_banned_words(self, cid, text, uid, uname, message_id=None):
        """Filtro de palabras prohibidas por grupo. Borra el mensaje y aplica la
        acción configurada (delete | warn | ban). Configurable desde la Mini App."""
        if not text or str(uid) == str(MASTER_ID):
            return False
        cfg = db.get(f"BADWORDS_{cid}", {})
        words = cfg.get("words", []) if isinstance(cfg, dict) else []
        if not words:
            return False
        low = text.lower()
        hit = next((w for w in words if w and w.lower() in low), None)
        if not hit:
            return False
        self.api_call("deleteMessage", {"chat_id": cid, "message_id": message_id}, silent=True)
        action = cfg.get("action", "delete")
        if action == "warn":
            warns = db.get(f"WARNS_{cid}", {})
            warns[str(uid)] = int(warns.get(str(uid), 0)) + 1
            db.set(f"WARNS_{cid}", warns)
            self.send_msg(cid, f"⚠️ {uname}: palabra no permitida. Aviso {warns[str(uid)]}.")
        elif action == "ban":
            try:
                self.apply_user_ban(cid, uid, uname, reason=f"palabra prohibida: {hit}",
                                    source="badwords", scope="local", message_id=message_id, notify=True)
            except Exception:
                self.api_call("banChatMember", {"chat_id": cid, "user_id": uid})
        add_audit_log(f"Palabra prohibida '{hit}' de {uname} ({uid}) en {cid} -> {action}")
        return True

    def restrict_user(self, cid, uid, until=0, can_send=False):
        permissions = {
            "can_send_messages": can_send, "can_send_media_messages": can_send,
            "can_send_polls": can_send, "can_send_other_messages": can_send,
            "can_add_web_page_previews": can_send, "can_change_info": False,
            "can_invite_users": False, "can_pin_messages": False
        }
        return self.api_call("restrictChatMember", {"chat_id": cid, "user_id": uid, "permissions": permissions, "until_date": until})

    def promote_user(self, cid, uid, is_admin=True):
        self._invalidate_admin_cache(str(cid))
        p = {
            "chat_id": cid, "user_id": uid, "can_change_info": is_admin, "can_delete_messages": is_admin,
            "can_invite_users": is_admin, "can_restrict_members": is_admin, "can_pin_messages": is_admin
        }
        return self.api_call("promoteChatMember", p)

    def set_title(self, cid, title):
        return self.api_call("setChatTitle", {"chat_id": cid, "title": title})

    def get_member(self, cid, uid):
        return self.api_call("getChatMember", {"chat_id": cid, "user_id": uid})
    def get_user_rank(self, cid, uid):
        uid_str = str(uid).strip()
        master_str = str(MASTER_ID).strip()
        if uid_str == master_str: return "Master"
        
        # Usar cachÃ© para evitar Rate Limits (1 hora de validez)
        cache_key = f"ADMINS_{cid}"
        admins_cached = db.get(cache_key, [])
        if admins_cached and str(uid) in admins_cached: return "Admin"
        
        # Si no estÃ¡ en cachÃ© o no es admin, consultar (con lÃ­mite de frecuencia: 5 minutos)
        now = time.time()
        last_check = db.get(f"LAST_ADMIN_CHECK_{cid}", 0)
        if now - last_check > 300:
            admins = self.api_call("getChatAdministrators", {"chat_id": cid}, silent=True)
            if admins.get("ok"):
                admin_ids = [str(a["user"]["id"]) for a in admins["result"]]
                db.set(cache_key, admin_ids)
                db.set(f"LAST_ADMIN_CHECK_{cid}", now)
                if str(uid) in admin_ids: return "Admin"
        
        return "User"

    # --- MÃ©todos Bot API 9.5â€“10.0 ---

    def unpin_msg(self, cid, mid=None):
        p = {"chat_id": cid}
        if mid is not None:
            p["message_id"] = mid
        return self.api_call("unpinChatMessage", p)

    def unpin_all_messages(self, cid):
        return self.api_call("unpinAllChatMessages", {"chat_id": cid})

    def unban_chat_member(self, cid, uid):
        return self.api_call("unbanChatMember", {"chat_id": cid, "user_id": uid, "only_if_banned": True})

    def send_chat_action(self, cid, action):
        return self.api_call("sendChatAction", {"chat_id": cid, "action": action}, silent=True)

    def send_voice(self, cid, voice, caption=""):
        return self.api_call("sendVoice", {"chat_id": cid, "voice": voice, "caption": caption})

    def send_sticker(self, cid, sticker):
        return self.api_call("sendSticker", {"chat_id": cid, "sticker": sticker})

    def forward_message(self, to_cid, from_cid, mid):
        return self.api_call("forwardMessage", {"chat_id": to_cid, "from_chat_id": from_cid, "message_id": mid})

    def copy_message(self, to_cid, from_cid, mid, caption=None):
        p = {"chat_id": to_cid, "from_chat_id": from_cid, "message_id": mid}
        if caption is not None:
            p["caption"] = caption
        return self.api_call("copyMessage", p)

    def get_chat(self, cid):
        return self.api_call("getChat", {"chat_id": cid})

    def get_chat_member_count(self, cid):
        return self.api_call("getChatMemberCount", {"chat_id": cid})

    def answer_callback_query(self, cbq_id, text=None, show_alert=False, url=None, cache_time=0):
        p = {"callback_query_id": cbq_id, "show_alert": show_alert, "cache_time": cache_time}
        if text:
            p["text"] = text
        if url:
            p["url"] = url
        return self.api_call("answerCallbackQuery", p)

    def set_message_reaction(self, cid, mid, reaction, is_big=False):
        if isinstance(reaction, str):
            reaction = [{"type": "emoji", "emoji": reaction}]
        return self.api_call("setMessageReaction", {
            "chat_id": cid, "message_id": mid, "reaction": reaction, "is_big": is_big,
        })

    # API 9.5: etiquetas de miembro
    def set_chat_member_tag(self, cid, uid, tag):
        return self.api_call("setChatMemberTag", {"chat_id": cid, "user_id": uid, "tag": tag})

    # API 9.6: botÃ³n de teclado preparado para bots administrados
    def save_prepared_keyboard_button(self, button, query_id):
        return self.api_call("savePreparedKeyboardButton", {"button": button, "query_id": query_id})

    # API 10.0: respuesta a guest queries
    def answer_guest_query(self, guest_query_id, text, show_alert=False):
        return self.api_call("answerGuestQuery", {
            "guest_query_id": guest_query_id, "text": text, "show_alert": show_alert,
        })

    # API 10.0: gestiÃ³n de reacciones
    def delete_message_reaction(self, cid, mid, reaction_type):
        if isinstance(reaction_type, str):
            reaction_type = {"type": "emoji", "emoji": reaction_type}
        return self.api_call("deleteMessageReaction", {
            "chat_id": cid, "message_id": mid, "reaction_type": reaction_type,
        })

    def delete_all_message_reactions(self, cid, mid):
        return self.api_call("deleteAllMessageReactions", {"chat_id": cid, "message_id": mid})

    # API 10.0: live photo
    def send_live_photo(self, cid, live_photo, caption=""):
        return self.api_call("sendLivePhoto", {"chat_id": cid, "live_photo": live_photo, "caption": caption})

    # API 10.0: configuraciÃ³n de acceso de bots administrados
    def get_managed_bot_access_settings(self, bot_id):
        return self.api_call("getManagedBotAccessSettings", {"bot_id": bot_id})

    def set_managed_bot_access_settings(self, bot_id, **kwargs):
        return self.api_call("setManagedBotAccessSettings", {"bot_id": bot_id, **kwargs})

    # API 10.0: mensajes del chat personal de usuario
    def get_user_personal_chat_messages(self, user_id, limit=100):
        return self.api_call("getUserPersonalChatMessages", {"user_id": user_id, "limit": limit})

    def _normalize_command_text(self, text):
        clean_text = (text or "").strip()
        if not clean_text.startswith("/"):
            return clean_text
        parts = clean_text.split(maxsplit=1)
        cmd = parts[0].split("@", 1)[0]
        return cmd if len(parts) == 1 else f"{cmd} {parts[1]}"

    def _run_plugin_command(self, cid, uid, text, rk):
        plugin_text = self._normalize_command_text(text)
        for plugin in self.plugins:
            if hasattr(plugin, "handle_command"):
                try:
                    if plugin.handle_command(self, cid, uid, plugin_text, rk):
                        return True
                except Exception as _pe:
                    add_web_log("ERROR", f"Plugin {getattr(plugin, '__name__', plugin)} error en handle_command: {_pe}")
        return False

    def handle_proxy_request(self, cid, uid, from_user):
        """Envía proxies MTProto: los propios + los del canal más cercanos al usuario
        (ubicación deducida por el idioma de Telegram)."""
        lang = (from_user or {}).get("language_code", "")
        cc, uloc = user_location_from_lang(lang)

        data = fetch_proxies()
        if not data or not data.get("proxies"):
            self.send_msg(cid, "⚠️ No pude obtener la lista de proxies ahora mismo. Prueba de nuevo en un minuto.")
            return

        proxies = data["proxies"]
        own = [p for p in proxies if p.get("source") == "own" and p.get("status") == "online"]
        channel = [p for p in proxies if p.get("source") == "channel" and p.get("status") == "online" and p.get("ll")]

        if uloc:
            for p in channel:
                try:
                    p["_dist"] = _haversine(uloc, (p["ll"][0], p["ll"][1]))
                except Exception:
                    p["_dist"] = 9e9
            channel.sort(key=lambda p: p.get("_dist", 9e9))
            zona = f"📍 Deduje tu zona por tu idioma ({lang} → {_flag(cc)} {cc}). Estos son los más cercanos:"
        else:
            channel.sort(key=lambda p: (p.get("pingMs") is None, p.get("pingMs") or 99999))
            zona = "No pude deducir tu país por el idioma, así que te paso los más rápidos disponibles:"

        nearest = channel[:6]
        lines = ["🌐 *Proxies MTProto para ti*", "", zona, ""]

        if own:
            lines.append("*🛡 Nuestros proxies (recomendados):*")
            for p in own:
                name = p.get("name") or p.get("server")
                lines.append(f"{_flag(p.get('country'))} `{name}` · {p.get('pingMs','?')} ms — [▶️ Conectar]({p['link']})")
            lines.append("")

        if nearest:
            lines.append("*🌍 Más cercanos a ti:*")
            for p in nearest:
                dist = f" · ~{int(p['_dist'])} km" if p.get("_dist") is not None else ""
                lines.append(f"{_flag(p.get('country'))} {p.get('country','??')} · {p.get('pingMs','?')} ms{dist} — [▶️ Conectar]({p['link']})")
            lines.append("")

        lines.append("_Pulsa «Conectar» y Telegram activará el proxy. Si uno falla, prueba otro._")
        self.send_msg(cid, "\n".join(lines))

    def _own_proxies_sorted(self, data):
        order = {"cintiabot": 0, "andreabot": 1, "todosobreall": 2}
        own = [p for p in data.get("proxies", []) if p.get("source") == "own"]
        return sorted(own, key=lambda p: order.get(p.get("name"), 9))

    def handle_proxy_status(self, cid):
        """Estado ACTUAL de los 3 proxies: usuarios ahora, hoy y países."""
        data = fetch_proxies()
        if not data or not data.get("proxies"):
            self.send_msg(cid, "⚠️ No pude obtener el estado de los proxies ahora mismo.")
            return
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        lines = ["📡 *Estado proxies MTProto*",
                 "_Ahora = conectados en este momento · Hoy = usuarios distintos del día (UTC)_", ""]
        tn = tt = 0
        for p in self._own_proxies_sorted(data):
            cs = p.get("connStats") or {}
            now = cs.get("activeNow", p.get("activeUsers") or 0) or 0
            td = (cs.get("daily") or {}).get(today, 0)
            tn += now; tt += td
            cnow = cs.get("countriesNow") or {}
            top = " ".join(f"{_flag(c)}{c}:{n}" for c, n in sorted(cnow.items(), key=lambda x: -x[1])[:4])
            st = "🟢" if p.get("status") == "online" else "🔴"
            ping = p.get("pingMs")
            head = f"{st} *{p.get('name')}* ({p.get('port')})"
            if ping is not None:
                head += f" · {ping} ms"
            lines.append(head)
            lines.append(f"   👥 Ahora: *{now}* · Hoy: *{td}*")
            lines.append(f"   🌍 {top or '—'}")
            lines.append("")
        lines.append(f"*Total:* 👥 {tn} ahora · {tt} hoy")
        self.send_msg(cid, "\n".join(lines))

    def handle_proxy_history(self, cid):
        """Histórico de conexiones (usuarios nuevos) por hora y por día."""
        data = fetch_proxies()
        if not data or not data.get("proxies"):
            self.send_msg(cid, "⚠️ No pude obtener el histórico ahora mismo.")
            return
        lines = ["📊 *Histórico de conexiones*",
                 "_usuarios distintos nuevos, por hora (24h) y por día (UTC)_", ""]
        for p in self._own_proxies_sorted(data):
            cs = p.get("connStats") or {}
            hourly = sorted((cs.get("hourly") or {}).items())[-12:]
            daily = sorted((cs.get("daily") or {}).items())[-7:]
            lines.append(f"▸ *{p.get('name')}* ({p.get('port')})")
            if hourly:
                lines.append("  🕐 " + " · ".join(f"{k[11:13]}h:{n}" for k, n in hourly[-8:]))
            else:
                lines.append("  🕐 sin datos aún")
            if daily:
                lines.append("  📅 " + " · ".join(f"{k[8:10]}/{k[5:7]}:{n}" for k, n in daily))
            lines.append("")
        self.send_msg(cid, "\n".join(lines))

    def handle_proxy_recommend(self, cid, uid, uname, arg_str):
        """Un usuario recomienda un proxy MTProto → se guarda pendiente y se avisa al master."""
        parsed = parse_proxy_link(arg_str)
        if not parsed:
            self.send_msg(cid, "🌐 Para recomendar un proxy, envía su enlace:\n`/recomendar https://t.me/proxy?server=...&port=...&secret=...`")
            return
        server, port, secret = parsed
        alive = tcp_alive(server, port)

        pend = db.get("PENDING_PROXIES", {})
        pid = str(db.get("PROXY_SUB_COUNTER", 0) + 1)
        db.set("PROXY_SUB_COUNTER", int(pid))
        pend[pid] = {"server": server, "port": port, "secret": secret, "by_uid": uid, "by_name": uname}
        db.set("PENDING_PROXIES", pend)

        self.send_msg(cid, f"✅ ¡Gracias {uname}! Tu proxy se envió para revisión. Si se aprueba, aparecerá en la web.")
        kb = {"inline_keyboard": [[
            {"text": "✅ Aprobar", "callback_data": f"appr_px:{pid}"},
            {"text": "❌ Rechazar", "callback_data": f"rej_px:{pid}"},
        ]]}
        self.api_call("sendMessage", {
            "chat_id": MASTER_ID,
            "text": (f"🌐 *Proxy recomendado* (#{pid})\n"
                     f"Por: {uname} (`{uid}`)\n"
                     f"`{server}:{port}`\nsecret: `{secret[:14]}…`\n"
                     f"Estado ahora: {'🟢 online' if alive else '🔴 no responde'}\n\n¿Publicar en la web?"),
            "parse_mode": "Markdown",
            "reply_markup": json.dumps(kb),
        })

    def handle_proxy_approval(self, cbq_id, cid, uid, data):
        """Callback de aprobar/rechazar (solo master)."""
        if str(uid) != str(MASTER_ID):
            self.answer_callback_query(cbq_id, "Solo el master puede aprobar.")
            return
        pid = data.split(":", 1)[1]
        pend = db.get("PENDING_PROXIES", {})
        item = pend.get(pid)
        if not item:
            self.answer_callback_query(cbq_id, "Ya no está pendiente.")
            return
        if data.startswith("appr_px:"):
            ok, info = submit_community_proxy(item["server"], item["port"], item["secret"], by=str(item.get("by_uid", "")))
            if ok:
                self.answer_callback_query(cbq_id, "✅ Publicado")
                self.send_msg(cid, f"✅ Proxy #{pid} (`{item['server']}:{item['port']}`) publicado en la web.")
                try:
                    self.send_msg(item["by_uid"], "✅ ¡Tu proxy recomendado ha sido aprobado y ya está en la web! Gracias 🙌")
                except Exception:
                    pass
            else:
                self.answer_callback_query(cbq_id, "Error al publicar")
                self.send_msg(cid, f"⚠️ No se pudo publicar #{pid}: {info.get('error')}")
                return
        else:
            self.answer_callback_query(cbq_id, "❌ Rechazado")
            self.send_msg(cid, f"❌ Proxy #{pid} rechazado.")
        del pend[pid]
        db.set("PENDING_PROXIES", pend)

    def handle_pending_proxies(self, cid):
        """Muestra la cola de proxies pendientes de aprobación, con botones."""
        pend = db.get("PENDING_PROXIES", {})
        if not pend:
            self.send_msg(cid, "✅ No hay proxies pendientes de aprobación.")
            return
        items = list(pend.items())
        self.send_msg(cid, f"🌐 *{len(items)} proxy(s) pendiente(s) de aprobación:*")
        for pid, item in items[:15]:
            alive = tcp_alive(item["server"], item["port"])
            kb = {"inline_keyboard": [[
                {"text": "✅ Aprobar", "callback_data": f"appr_px:{pid}"},
                {"text": "❌ Rechazar", "callback_data": f"rej_px:{pid}"},
            ]]}
            self.api_call("sendMessage", {
                "chat_id": cid,
                "text": (f"#{pid} · por {item.get('by_name', '?')}\n"
                         f"`{item['server']}:{item['port']}`\nsecret: `{item['secret'][:14]}…`\n"
                         f"Estado: {'🟢 online' if alive else '🔴 no responde'}"),
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(kb),
            })
        if len(items) > 15:
            self.send_msg(cid, f"… y {len(items) - 15} más.")

    def process_command(self, cid, uid, uname, text, rk, msg_id, msg):
        clean_text = self._normalize_command_text(text)
        if not clean_text.startswith("/"): return False
        
        # 1. Limpieza de comando (soporte para /cmd@botname)
        parts = clean_text.split()
        raw_cmd = parts[0].lower().split("@")[0]
        args = parts[1:]
        arg_str = " ".join(args)
        
        add_web_log("DEBUG", f"[CMD] Procesando '{raw_cmd}' de {uname} (Rango: {rk})")

        # 2. Comandos PÃºblicos / Globales
        # --- Proxies MTProto (solo CintiaBot) ---
        if raw_cmd in ["/proxy", "/proxies", "/proxi"]:
            if (self.bot_username or "").lower() == "cintiabot":
                self.handle_proxy_request(cid, uid, msg.get("from", {}))
            else:
                self.send_msg(cid, "Este comando solo está disponible en @CintiaBot.")
            return True

        # Recomendar un proxy (cualquier usuario) → lo aprueba el master
        if raw_cmd in ["/recomendar", "/recommend", "/addproxy"]:
            if (self.bot_username or "").lower() == "cintiabot":
                self.handle_proxy_recommend(cid, uid, uname, arg_str)
            else:
                self.send_msg(cid, "Este comando solo está disponible en @CintiaBot.")
            return True

        # Cola de proxies recomendados pendientes (solo CintiaBot, Admin/Master)
        if raw_cmd in ["/pendientes", "/pending", "/cola"]:
            if (self.bot_username or "").lower() == "cintiabot" and str(uid) == str(MASTER_ID):
                self.handle_pending_proxies(cid)
            elif (self.bot_username or "").lower() == "cintiabot":
                self.send_msg(cid, "🔒 Solo el dueño del bot.")
            return True

        # Estado e histórico de los proxies (solo CintiaBot, Admin/Master)
        if raw_cmd in ["/estado", "/estadoproxy", "/proxystatus"]:
            if (self.bot_username or "").lower() == "cintiabot" and str(uid) == str(MASTER_ID):
                self.handle_proxy_status(cid)
            elif (self.bot_username or "").lower() == "cintiabot":
                self.send_msg(cid, "🔒 Solo el dueño del bot.")
            return True

        if raw_cmd in ["/historico", "/historial", "/conexiones"]:
            if (self.bot_username or "").lower() == "cintiabot" and str(uid) == str(MASTER_ID):
                self.handle_proxy_history(cid)
            elif (self.bot_username or "").lower() == "cintiabot":
                self.send_msg(cid, "🔒 Solo el dueño del bot.")
            return True

        if raw_cmd in ["/start", "/inicio", "/panel", "/menu"] and (self.bot_username or "").lower() == "cintiabot":
            kb = {"inline_keyboard": [
                [{"text": "🚀 Abrir panel", "web_app": {"url": "https://cintiabot.todosobreall.tech/hub.html"}}],
                [{"text": "🌐 Pedir proxy MTProto", "callback_data": "req_proxy"}],
            ]}
            self.api_call("sendMessage", {
                "chat_id": cid,
                "text": (f"🌙 *Hola {uname}*\n\nSoy *CintiaBot*. Abre el *panel* para acceder a todas "
                         "las funciones: proxies MTProto, directorio de canales y servicios de la red.\n\n"
                         "También puedes escribir /proxy para pedir un proxy directamente."),
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(kb),
            })
            return True

        if raw_cmd in ["/start", "/inicio"]:
            self.send_msg(cid, f"ðŸŒ™ **Moon Multibot Activo**\n\nHola {uname}, el nÃºcleo estÃ¡ operando con normalidad. Usa `/ayuda` para ver mis capacidades.")
            return True
        
        if raw_cmd in ["/ayuda", "/comandos", "/help"]:
            help_text = "ðŸ“– **MANUAL DE OPERACIONES MOON**\n\n"
            help_text += "âœ¨ **General:** `/perfil`, `/top`, `/notas`, `/search`, `/ia_info`\n"
            help_text += "ðŸŒ **TraducciÃ³n:** `/traducir`, `/aprender_traduccion es en hola = hello`\n"
            if rk in ["Admin", "Master"]:
                help_text += "ðŸ›¡ï¸ **ModeraciÃ³n:** `/mute`, `/ban`, `/unban`, `/gban`, `/ungban`, `/warn`\n"
                help_text += "âš™ï¸ **Ajustes:** `/settings`, `/ia_feed`, `/resumen`, `/ia_programar`\n"
            
            help_text += "\nðŸ§  **Arquitectura HÃ­brida:** Cintia combina IA Nativa con Gemini (Nube) y Ollama (Local)."
            self.send_msg(cid, help_text)
            return True

        if raw_cmd == "/ia_info":
            mode_text = "ðŸŒ™ IA Nativa (Moon)"
            if USE_EXTERNAL_LLM:
                mode_text = f"ðŸŒ HÃ­brida ({LLM_PROVIDER.upper()})"
                if DEEP_DREAM_MODE: mode_text += " + ðŸŒ™ SueÃ±o Profundo"
            
            info = (
                "ðŸ§  *Cintia Intelligence Report*\n"
                "--------------------------------\n"
                f"âš™ï¸ *Modo Actual:* {mode_text}\n"
                f"ðŸ“Š *Conocimiento:* {len(self.ia.brain)} palabras\n"
                f"ðŸ”— *Conexiones:* {sum(len(v) for v in self.ia.brain.values())}\n"
                "--------------------------------\n"
                "Cintia ahora usa una arquitectura hÃ­brida que combina su red neuronal local con modelos de lenguaje avanzados (Gemini/Ollama)."
            )
            self.send_msg(cid, info)
            return True

        if raw_cmd == "/ping":
            self.send_msg(cid, "ðŸ“ **PONG!** NÃºcleo Moon sincronizado.")
            return True

        if raw_cmd in ["/games", "/juegos"]:
            self._send_games_menu(cid, "🎮 **Panel de Juegos Moon**\nElige un minijuego:")
            return True

        if raw_cmd == "/perfil":
            user_data = db.get(f"USER_{uid}", {"karma": 0, "level": 1, "exp": 0})
            stats = global_user_stats.get(uid, {"count": 0, "karma": 0})
            k_score = stats.get("karma", 0)
            badge = "ðŸ† Leyenda" if k_score > 50 else "â­ Colaborador" if k_score > 20 else "ðŸ‘¤ Miembro"
            self.send_msg(cid, f"ðŸ‘¤ **PERFIL: {uname}**\n\nðŸ†™ Nivel: `{user_data.get('level', 1)}`\nâš¡ EXP: `{user_data.get('exp', 0)}`\nâ­ Karma: `{k_score}`\nðŸ’¬ Mensajes: `{stats.get('count', 0)}`\nðŸ… Insignia: {badge}")
            return True

        if raw_cmd == "/top":
            sorted_u = sorted(global_user_stats.items(), key=lambda x: x[1].get("count", 0), reverse=True)[:5]
            if not sorted_u: self.send_msg(cid, "ðŸ“Š AÃºn no hay datos.")
            else:
                medals = ["ðŸ¥‡", "ðŸ¥ˆ", "ðŸ¥‰", "4ï¸âƒ£", "5ï¸âƒ£"]
                lines = [f"{medals[i]} **{v['name']}**: {v.get('count',0)} msgs" for i, (k, v) in enumerate(sorted_u)]
                self.send_msg(cid, "ðŸ† **TOP 5 USUARIOS**\n\n" + "\n".join(lines))
            return True

        if raw_cmd == "/search" and arg_str:
            self.send_msg(cid, "ðŸ” Consultando fuentes globales...")
            res = ia_nativa.search_web(arg_str)
            self.send_msg(cid, f"ðŸŒ **Resultado:**\n\n{res}")
            return True

        if raw_cmd in ["/traducir", "/translate", "/tr"]:
            if not args:
                self.send_msg(cid, "ðŸŒ Uso: `/traducir en hola mundo` o responde a un mensaje con `/traducir en`.")
                return True

            target_lang = args[0]
            text_to_translate = " ".join(args[1:]).strip()
            if not text_to_translate and msg.get("reply_to_message"):
                text_to_translate = msg["reply_to_message"].get("text") or msg["reply_to_message"].get("caption", "")

            if not text_to_translate:
                self.send_msg(cid, "âš ï¸ No encontrÃ© texto para traducir.")
                return True

            translated = ia_nativa.translate_text(text_to_translate, target_lang)
            target_code = ia_nativa.normalize_language_code(target_lang)
            target_name = ia_nativa.get_language_name(target_code)
            self.send_msg(cid, f"ðŸŒ **TraducciÃ³n a {target_name}:**\n\n{translated}")
            return True

        if raw_cmd in ["/aprender_traduccion", "/learn_translation"]:
            lesson = arg_str
            if "=" not in lesson:
                self.send_msg(cid, "ðŸŒ Uso: `/aprender_traduccion es en hola mundo = hello world`.")
                return True

            left, translated = lesson.split("=", 1)
            lesson_parts = left.strip().split(maxsplit=2)
            if len(lesson_parts) < 3:
                self.send_msg(cid, "ðŸŒ Uso: `/aprender_traduccion es en hola mundo = hello world`.")
                return True

            source_lang, target_lang, original = lesson_parts
            ia_nativa.learn_translation(
                original.strip(),
                translated.strip(),
                target_lang,
                source_lang=source_lang,
                source=f"telegram:{uname}"
            )
            self.send_msg(cid, "âœ… TraducciÃ³n aprendida por la IA local.")
            return True

        # 3. Comandos de ConfiguraciÃ³n & ModeraciÃ³n (Admin/Master)
        if rk in ["Admin", "Master"]:
            # Detectar si es una respuesta (Reply)
            target_uid = arg_str if arg_str else (str(msg.get("reply_to_message", {}).get("from", {}).get("id", "")) if msg.get("reply_to_message") else None)
            target_name = msg.get("reply_to_message", {}).get("from", {}).get("first_name", target_uid) if msg.get("reply_to_message") else target_uid

            if raw_cmd in ["/ia_programar", "/ia_code", "/programar_ia"]:
                if rk != "Master":
                    self.send_msg(cid, "🔒 Solo el dueño del bot (entrena la IA global).")
                    return True
                langs = [x.strip() for x in (arg_str or "python,javascript,typescript,sql,html,css,bash,go,rust,java").split(",")]
                threading.Thread(target=ia_nativa.seed_programming_knowledge, args=(langs,), daemon=True).start()
                self.send_msg(cid, f"ðŸ’» **IA Programadora:** aprendizaje iniciado para `{', '.join([l for l in langs if l])}`.")
                return True

            if raw_cmd == "/settings":
                c = db.get(f"CONFIG_{cid}", {"ia_learning": False, "auto_mod": True, "ia_mood": "friendly"})
                txt = f"âš™ï¸ **CONFIGURACIÃ“N DEL NODO {cid}**\n\n"
                txt += f"ðŸŒ™ VersiÃ³n del bot: `{APP_VERSION}`\n"
                txt += f"ðŸ§  IA Learning: `{'âœ… ON' if c.get('ia_learning') else 'âŒ OFF'}`\n"
                txt += f"ðŸ›¡ï¸ Neural Shield: `{'âœ… ON' if c.get('auto_mod') else 'âŒ OFF'}`\n"
                txt += f"ðŸŽ­ Mood: `{c.get('ia_mood', 'friendly')}`\n\n"
                txt += "Usa el Dashboard para cambios avanzados."
                self.send_msg(cid, txt)
                return True

            if raw_cmd in ["/ban", "/gban"]:
                if not target_uid:
                    self.send_msg(cid, "âš ï¸ **ERROR:** Debes responder a un mensaje o indicar el ID del usuario para banear.")
                    return True
                scope = "global" if raw_cmd == "/gban" else "local"
                if scope == "global" and rk != "Master":
                    self.send_msg(cid, "🔒 El ban global (/gban) es solo del dueño. Usa /ban para este grupo.")
                    return True
                reply_mid = msg.get("reply_to_message", {}).get("message_id") if msg.get("reply_to_message") else None
                reason = "Comando /gban" if scope == "global" else f"Comando /ban en {cid}"
                self.apply_user_ban(cid, target_uid, target_name, reason=reason, source="command", scope=scope, message_id=reply_mid)
                self.send_msg(cid, f"ðŸš« **{target_name}** expulsado y baneado ({scope}).")
                return True

            if raw_cmd == "/mute":
                if not target_uid:
                    self.send_msg(cid, "âš ï¸ **ERROR:** Debes responder a un mensaje para silenciar al usuario.")
                    return True
                until = int(time.time()) + 3600
                self.restrict_user(cid, target_uid, until=until, can_send=False)
                muted = db.get(f"MUTED_{cid}", [])
                if target_uid not in muted: muted.append(target_uid); db.set(f"MUTED_{cid}", muted)
                self.send_msg(cid, f"ðŸ”‡ **{target_name}** ha sido silenciado por 1 hora.")
                return True

            if raw_cmd == "/unmute" and target_uid:
                self.restrict_user(cid, target_uid, until=0, can_send=True)
                muted = db.get(f"MUTED_{cid}", [])
                if target_uid in muted: muted.remove(target_uid); db.set(f"MUTED_{cid}", muted)
                self.send_msg(cid, f"ðŸ”Š **{target_name}** puede hablar de nuevo.")
                return True

            if raw_cmd in ["/unban", "/ungban"] and target_uid:
                if raw_cmd == "/ungban" and rk != "Master":
                    self.send_msg(cid, "🔒 El indulto global (/ungban) es solo del dueño. Usa /unban para este grupo.")
                    return True
                self.api_call("unbanChatMember", {"chat_id": cid, "user_id": target_uid})
                if raw_cmd == "/ungban":
                    ban_manager.unban_user(target_uid)
                    scope = "global"
                else:
                    ban_manager.unban_local_user(cid, target_uid)
                    scope = "local"
                self.send_msg(cid, f"âœ… **{target_uid}** ha sido indultado ({scope}).")
                return True

            if raw_cmd == "/warn":
                if not target_uid:
                    self.send_msg(cid, "âš ï¸ **ERROR:** Debes responder a un mensaje para advertir al usuario.")
                    return True
                warns = db.get(f"WARNS_{cid}", {})
                warns[target_uid] = warns.get(target_uid, 0) + 1
                db.set(f"WARNS_{cid}", warns)
                self.send_msg(cid, f"âš ï¸ **{target_name}**: Advertencia {warns[target_uid]}/3.")
                if warns[target_uid] >= 3:
                    self.apply_user_ban(cid, target_uid, target_name, reason="3 advertencias", source="warns", scope="local")
                    self.send_msg(cid, f"ðŸ’€ **{target_name}** expulsado por acumulaciÃ³n de advertencias.")
                return True

            if raw_cmd == "/ia_feed":
                if rk != "Master":
                    self.send_msg(cid, "🔒 Solo el dueño del bot (alimenta la IA global).")
                    return True
                feeder_groups = db.get("IA_FEEDERS", [])
                if arg_str == "on":
                    if cid not in feeder_groups: feeder_groups.append(cid); db.set("IA_FEEDERS", feeder_groups)
                    self.send_msg(cid, "ðŸ“¡ Modo alimentaciÃ³n IA activado.")
                elif arg_str == "off":
                    if cid in feeder_groups: feeder_groups.remove(cid); db.set("IA_FEEDERS", feeder_groups)
                    self.send_msg(cid, "âœ… Modo alimentaciÃ³n IA desactivado.")
                return True

            if raw_cmd == "/resumen":
                hist = db.get("GLOBAL_HISTORY", [])
                chat_msgs = [m for m in hist if str(m.get("cid")) == cid][-20:]
                if chat_msgs:
                    all_text = " ".join(m.get("text", "") for m in chat_msgs if m.get("text"))
                    summary = ia_nativa.generate(all_text[:150], chat_id=cid)
                    self.send_msg(cid, f"ðŸ“Š **Resumen IA:** {summary}")
                return True

            if raw_cmd == "/resync":
                if rk != "Master": return False
                self.send_msg(cid, "ðŸ§  **SINCRONIZACIÃ“N:** Recargando memoria neuronal...")
                ia_nativa.load_brain()
                self.send_msg(cid, f"âœ… **Ã‰XITO:** Memoria sincronizada. Ahora tengo {len(ia_nativa.brain.get('keywords',{}))} neuronas activas.")
                return True

        # 4. Comandos Master
        if rk == "Master":
            if raw_cmd == "/listen":
                global listen_mode
                listen_mode = (arg_str == "on")
                db.set("LISTEN_MODE", listen_mode)
                self.send_msg(cid, f"{'ðŸ”‡' if listen_mode else 'ðŸ”Š'} Modo escucha: {arg_str}")
                return True

            if raw_cmd == "/backup_db":
                db_path = "data/moon_database.db"
                if os.path.exists(db_path): self.send_document(cid, db_path, "Backup DB")
                return True

        # 5. Comandos de Texto Personalizados (S_FILE)
        s_file = db.get("S_FILE", {})
        if raw_cmd[1:] in s_file:
            self.send_msg(cid, s_file[raw_cmd[1:]]["text"])
            return True

        return False

    def sync_channel_admins(self, chat_id):
        """Cruza getChatAdministrators y cachea creator/administrators en PocketBase."""
        try:
            res = self.api_call("getChatAdministrators", {"chat_id": chat_id})
            if not res.get("ok"):
                return 0
            admins = []
            for m in res.get("result", []):
                usr = m.get("user") or {}
                if usr.get("is_bot"):
                    continue
                status = m.get("status")
                if status in ("creator", "administrator"):
                    admins.append({"user_id": usr.get("id"), "status": status})
            channel_stats.set_channel_admins(chat_id, admins)
            return len(admins)
        except Exception as e:
            add_web_log("ERROR", f"sync_channel_admins {chat_id}: {e}")
            return 0

    def handle_channel_membership(self, u):
        """Directorio de canales: alta/baja cuando se añade/quita el bot como admin."""
        mcm = u.get("my_chat_member")
        if not mcm:
            return False
        try:
            chat = mcm.get("chat", {})
            chat_id = chat.get("id")
            ctype = chat.get("type")
            new_status = (mcm.get("new_chat_member") or {}).get("status")
            if not chat_id or ctype not in ("channel", "supergroup"):
                return True  # ignoramos privados/grupos normales para el directorio
            if new_status == "administrator":
                info = self.api_call("getChat", {"chat_id": chat_id})
                r = info.get("result", {}) if info.get("ok") else {}
                cnt = self.api_call("getChatMemberCount", {"chat_id": chat_id})
                members = cnt.get("result", 0) if cnt.get("ok") else 0
                channel_stats.register_channel(
                    chat_id,
                    username=r.get("username"),
                    title=r.get("title") or chat.get("title"),
                    description=r.get("description"),
                    ctype=ctype,
                    bot_token=self.token,
                    added_by=(mcm.get("from") or {}).get("id"),
                )
                if members:
                    channel_stats.record_snapshot(chat_id, members)
                # Verificación de propiedad: cruce con getChatAdministrators (cacheado)
                self.sync_channel_admins(chat_id)
                add_web_log("SUCCESS", f"Canal anadido al directorio: {r.get('title') or chat_id} ({members} subs)")
                self.api_call("sendMessage", {
                    "chat_id": chat_id,
                    "text": "✅ Este canal se ha anadido al directorio de estadisticas de ComunidadTelebots.\n\nSus metricas (suscriptores y crecimiento) se recopilaran a partir de ahora en canales.todosobreall.tech",
                    "disable_notification": True,
                })
            elif new_status in ("left", "kicked", "member", "restricted"):
                channel_stats.deactivate_channel(chat_id)
                add_web_log("INFO", f"Canal retirado del directorio: {chat_id} (estado {new_status})")
        except Exception as e:
            add_web_log("ERROR", f"handle_channel_membership: {e}")
        return True

    def handle_join_request(self, u):
        """Captcha anti-bot. Si CintiaBot es guard_bot del chat, el update
        chat_join_request llega con query_id → abrimos la Mini App de verificación."""
        if (self.bot_username or "").lower() != "cintiabot":
            return False
        jr = u.get("chat_join_request")
        if not jr:
            return False
        query_id = jr.get("query_id")
        if not query_id:
            return False  # no somos guard_bot / feature desactivada → ignorar
        try:
            cid = (jr.get("chat") or {}).get("id")
            uid = (jr.get("from") or {}).get("id")
            if cid is None or uid is None:
                return True
            db.set(f"JOINQ_{cid}_{uid}", {
                "query_id": query_id, "chat_id": cid, "user_id": uid,
                "attempts": 0, "exp": int(time.time()) + 86400,
            })
            self.api_call("sendChatJoinRequestWebApp", {
                "chat_id": cid, "user_id": uid,
                "web_app": {"url": f"https://cintiabot.todosobreall.tech/join.html?chat={cid}"},
            })
            add_web_log("SECURITY", f"Captcha de entrada enviado a {uid} en {cid}")
        except Exception as e:
            add_web_log("ERROR", f"handle_join_request: {e}")
        return True

    def run_periodic_maintenance(self):
        now_s = int(time.time())

        # Snapshot diario de suscriptores + refresco de la caché de propiedad (Bot API).
        if now_s - db.get("LAST_CHANNEL_SNAPSHOT", 0) > 86400:
            db.set("LAST_CHANNEL_SNAPSHOT", now_s)
            def _channel_snapshot():
                try:
                    chans = channel_stats.active_channels(self.token)
                except Exception:
                    return
                for ch in chans:
                    cid = ch.get("chat_id")
                    try:
                        cnt = self.api_call("getChatMemberCount", {"chat_id": cid})
                        if not cnt.get("ok"):
                            continue
                        channel_stats.record_snapshot(cid, cnt.get("result", 0))
                        info = self.api_call("getChat", {"chat_id": cid})
                        if info.get("ok"):
                            r = info["result"]
                            channel_stats.update_meta(cid, r.get("username"), r.get("title"), r.get("description"))
                    except Exception:
                        pass
            threading.Thread(target=_channel_snapshot, daemon=True).start()

        # Despacho de mensajes programados (cada ciclo de polling ~cada 20s).
        try:
            due = channel_stats.due_scheduled()
        except Exception:
            due = []
        for m in due:
            try:
                cid = m.get("chat_id")
                bot = get_bot_for_chat(cid) or self
                photo = m.get("photo")
                data = image_gen.fetch_bytes(photo) if photo else None
                if data:
                    requests.post(
                        f"https://api.telegram.org/bot{bot.token}/sendPhoto",
                        data={"chat_id": str(cid), "caption": (m.get("text") or "")[:1024]},
                        files={"photo": ("imagen.jpg", data)}, timeout=45,
                    )
                else:
                    bot.send_msg(cid, m.get("text", ""))
                channel_stats.mark_sent(m["id"])
                add_web_log("SUCCESS", f"Programado enviado a {cid}" + (" (imagen)" if data else ""))
            except Exception as e:
                add_web_log("ERROR", f"envío programado {m.get('id')}: {e}")

        # Refresco de la caché de propiedad (getChatAdministrators) cada 6h.
        if now_s - db.get("LAST_CHANNEL_ADMINS_SYNC", 0) > 21600:
            db.set("LAST_CHANNEL_ADMINS_SYNC", now_s)
            def _admins_sync():
                try:
                    stale = channel_stats.channels_needing_admin_refresh(21600, self.token)
                except Exception:
                    return
                for ch in stale:
                    self.sync_channel_admins(ch.get("chat_id"))
            threading.Thread(target=_admins_sync, daemon=True).start()

        # 1. SincronizaciÃ³n de Seguridad (Hashes Externos)
        sync_freq = int(db.get("GLOBAL_SETTINGS", {}).get("sync_frequency", 21600))
        if now_s - db.get("LAST_SECURITY_SYNC", 0) > sync_freq:
            threading.Thread(target=self.sync_security_hashes).start()
            db.set("LAST_SECURITY_SYNC", now_s)

        # 2. Purga de Archivos Multimedia (Downloads)
        purge_days = int(db.get("GLOBAL_SETTINGS", {}).get("media_purge_days", 7))
        if now_s - db.get("LAST_MEDIA_PURGE", 0) > 86400:
            self.purge_old_media(purge_days)
            db.set("LAST_MEDIA_PURGE", now_s)

        # 3. Backup automÃ¡tico de la base de datos cada 24h al Master
        if now_s - db.get("LAST_AUTO_BACKUP", 0) > 86400:
            db.set("LAST_AUTO_BACKUP", now_s)
            if MASTER_ID:
                def _auto_backup():
                    db_path = "data/moon_database.db"
                    if os.path.exists(db_path):
                        size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2)
                        res = self.send_document(MASTER_ID, db_path, f"ðŸ”„ Backup automÃ¡tico 24h â€” {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} ({size_mb} MB)")
                        if res.get("ok"):
                            add_web_log("SUCCESS", f"Backup automÃ¡tico enviado al Master ({size_mb} MB).")
                        else:
                            add_web_log("ERROR", "Fallo al enviar backup automÃ¡tico.")
                threading.Thread(target=_auto_backup, daemon=True).start()

        # 4. Backup de aprendizaje cada 1h al Master
        learning_backup_interval = int(db.get("GLOBAL_SETTINGS", {}).get("learning_backup_interval", 3600))
        if now_s - db.get("LAST_LEARNING_BACKUP", 0) > learning_backup_interval:
            db.set("LAST_LEARNING_BACKUP", now_s)
            if MASTER_ID:
                def _learning_backup():
                    db_path = "data/moon_database.db"
                    if os.path.exists(db_path):
                        size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2)
                        stats = ia_nativa.get_stats()
                        caption = (
                            f"ðŸ§  Backup aprendizaje 1h â€” {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} ({size_mb} MB)\n"
                            f"Neuronas: {stats.get('words')}\n"
                            f"Hito 1B/12H: {stats.get('billion_progress')} | {stats.get('billion_status')}"
                        )
                        res = self.send_document(MASTER_ID, db_path, caption)
                        if res.get("ok"):
                            add_web_log("SUCCESS", f"Backup de aprendizaje enviado al Master ({size_mb} MB).")
                        else:
                            add_web_log("ERROR", "Fallo al enviar backup de aprendizaje.")
                threading.Thread(target=_learning_backup, daemon=True).start()

    def run(self):
        global listen_mode
        offset = 0
        _poll_failures = 0
        while True:
            try:
                res = self.api_call("getUpdates", build_get_updates_payload(offset, allowed_updates=DEFAULT_ALLOWED_UPDATES))
                if not res.get("ok"):
                    _poll_failures += 1
                    backoff = min(300, 5 * (2 ** min(_poll_failures - 1, 5)))
                    add_web_log("ERROR", f"Error getUpdates: {res.get('description')} â€” reintentando en {backoff}s (intento {_poll_failures})")
                    time.sleep(backoff); continue
                _poll_failures = 0
                
                if not res.get("result"): 
                    # Solo logueamos cada 10 intentos vacÃ­os para no saturar
                    if random.random() < 0.1: add_web_log("DEBUG", "Esperando nuevos mensajes de Telegram...")
                    self.run_periodic_maintenance()
                    continue
                
                for u in res["result"]:
                    offset = u["update_id"]
                    if self.handle_inline_query(u):
                        continue
                    if self.handle_chosen_inline_result(u):
                        continue
                    if self.handle_callback_query(u):
                        continue
                    if self.handle_message_reaction(u):
                        continue
                    if u.get("message_reaction_count"):
                        continue
                    if self.record_managed_bot_update(u):
                        continue
                    if self.record_business_update(u):
                        continue
                    if self.handle_guest_update(u):
                        continue
                    if self.handle_channel_membership(u):
                        continue
                    if self.handle_join_request(u):
                        continue
                    # DetecciÃ³n de Mensajes (EstÃ¡ndar, Canal o Business)
                    msg = u.get("message") or u.get("channel_post") or u.get("business_message")
                    if not msg: continue
                    # Directorio de canales: cuenta posts publicados (frecuencia).
                    if u.get("channel_post"):
                        try:
                            channel_stats.record_post(msg["chat"]["id"], msg["message_id"])
                        except Exception:
                            pass
                    
                    b_conn_id = u.get("business_message", {}).get("business_connection_id")
                    self.last_msg_id = msg.get("message_id")

                    cid = str(msg["chat"]["id"])
                    # Registrar chat para este bot especÃ­fico
                    bot_chats = db.get(f"CHATS_{self.token}", [])
                    if cid not in bot_chats:
                        bot_chats.append(cid)
                        db.set(f"CHATS_{self.token}", bot_chats)
                    cid, text, user = str(msg["chat"]["id"]), msg.get("text", ""), msg.get("from", {})
                    add_web_log("DEBUG", f"Nuevo mensaje detectado: CID={cid}, User={user.get('first_name')}")
                    if not isinstance(text, str): text = str(text) if text is not None else ""
                    if user.get("is_bot"): continue # Ignorar otros bots
                    uid, uname = str(user.get("id", cid)), user.get("first_name", "Chat")
                    add_web_log("DEBUG", f"Deteccion de ID: Usuario={uid} | Nombre={uname} | Verificando Permisos...")

                    # Cortafuegos temprano: no dar karma, aprendizaje ni proceso a usuarios baneados.
                    if self.enforce_existing_ban(cid, uid, uname, msg.get("message_id")):
                        continue
                    if self.enforce_cas_ban(cid, uid, uname, msg.get("message_id")):
                        continue
                    if self.enforce_banned_words(cid, text, uid, uname, msg.get("message_id")):
                        continue

                    # Sistema de AuditorÃ­a IA (EvaluaciÃ³n de Calidad)
                    if cid in active_audits:
                        audit = active_audits[cid]
                        if audit["status"] == "listening":
                            audit["messages"].append(text)
                            # PuntuaciÃ³n: Longitud de palabras + variedad
                            words = text.split()
                            unique_words = len(set(words))
                            # Penalizar SPAM en tiempo real
                            spam_triggers = ["gane", "euros", "bancaria", "billetera", "rentabilidad"]
                            if any(t in text.lower() for t in spam_triggers):
                                audit["score"] -= 100 # PenalizaciÃ³n crÃ­tica
                                add_web_log("IA", f"âš ï¸ SPAM detectado en auditorÃ­a de {cid}. Penalizando fuente.")
                            else:
                                audit["score"] += (unique_words * 2) + (len(text) // 10)
                            
                            if len(audit["messages"]) >= 15:
                                audit["status"] = "finished"
                                audit["final_score"] = min(100, (audit["score"] // 15) * 5)
                                all_text = " ".join(audit["messages"][:15])
                                audit["report"] = {
                                    "time": datetime.datetime.now().strftime("%d/%m %H:%M"),
                                    "chat": audit.get("name", cid),
                                    "cid": cid,
                                    "score": audit["final_score"],
                                    "avg_len": len(all_text) // 15,
                                    "unique_words": len(set(all_text.split())),
                                    "verdict": "RECOMENDADO" if audit["final_score"] > 60 else "NO RECOMENDADO"
                                }
                                # Guardar en Historial
                                hist = db.get("IA_AUDIT_HISTORY", [])
                                hist.append(audit["report"])
                                db.set("IA_AUDIT_HISTORY", hist[-50:])
                                db.set("ACTIVE_AUDITS", active_audits)
                                add_web_log("SUCCESS", f"AuditorÃ­a Finalizada y Guardada: {audit.get('name', cid)} ({audit['final_score']}%)")
                                # No retornamos aquÃ­ para que tambiÃ©n aprenda o procese si es necesario
                    
                    # DetecciÃ³n AutomÃ¡tica de Fuentes Potenciales (Feeders sugeridos)
                    if cid.startswith("-"):
                        feeder_groups = db.get("IA_FEEDERS", [])
                        if cid not in feeder_groups:
                            potentials = db.get("POTENTIAL_FEEDERS", {})
                            if cid not in potentials:
                                potentials[cid] = {"name": global_chat_names.get(cid, cid), "last": datetime.datetime.now().strftime("%H:%M:%S")}
                                db.set("POTENTIAL_FEEDERS", potentials)
                                # Auto-AuditorÃ­a: Comenzar a analizar de inmediato de forma silenciosa
                                if cid not in active_audits:
                                    _start_audit_logic(cid)
                    
                    # Karma & RPG System
                    user_id = str(uid)
                    user_data = db.get(f"USER_{user_id}", {"karma": 0, "level": 1, "exp": 0, "titles": []})
                    user_data["karma"] += 1
                    user_data["exp"] += 10
                    if user_data["exp"] >= user_data["level"] * 100:
                        user_data["level"] += 1
                        user_data["exp"] = 0
                        uname_safe = re.sub(r"([_*`\\[\\]()~>#+\\-=|{}.!])", r"\\\\\\1", str(uname or "Usuario"))
                        self.send_msg(cid, f"🆙 **LEVEL UP!** {uname_safe} ha subido al nivel `{user_data['level']}`.")
                    db.set(f"USER_{user_id}", user_data)
                    
                    # Advanced Link Filter (Low Karma Check)
                    if "http" in text.lower() and user_data["karma"] < 10:
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})
                        self.send_msg(cid, f"ðŸš« **FILTRO DE SPAM:** {uname}, necesitas al menos 10 puntos de Karma para enviar enlaces.")
                        continue
                    
                    # Anti-Raid 2.0 (Mass Join Detection)
                    if "new_chat_members" in msg:
                        join_security_hit = False
                        for member in msg.get("new_chat_members", []):
                            if member.get("is_bot"):
                                continue
                            member_uid = str(member.get("id", ""))
                            member_name = member.get("first_name", member_uid)
                            if member_uid and self.enforce_existing_ban(cid, member_uid, member_name, msg.get("message_id")):
                                join_security_hit = True
                                continue
                            if member_uid and self.enforce_cas_ban(cid, member_uid, member_name, msg.get("message_id")):
                                join_security_hit = True
                                continue
                        if join_security_hit:
                            continue
                        join_count = len(msg["new_chat_members"])
                        if join_count > 5:
                            self.send_msg(cid, "ðŸš¨ **ANTI-RAID 2.0 ACTIVADO:** Detectada entrada masiva. Bloqueando acceso temporalmente...")
                            add_web_log("SECURITY", f"Anti-Raid activado en chat {cid} (Entrada: {join_count} usuarios)")
                            continue
                    
                    # Debug message
                    add_web_log("DEBUG", f"Procesando mensaje de {uname} en {global_chat_names.get(cid, cid)}: {text[:20]}")
                    
                    # Global History Log (Captured before any filtering)
                    history = db.get("GLOBAL_HISTORY", [])
                    history.append({
                        "time": datetime.datetime.now().strftime("%H:%M:%S"),
                        "chat": global_chat_names.get(cid, cid),
                        "cid": cid,
                        "user": f"{uname} (@{user.get('username', '??')})",
                        "text": text or "[Contenido Multimedia]"
                    })
                    if len(history) > 300: history.pop(0) # Aumentado para auditorÃ­a retrospectiva
                    db.set("GLOBAL_HISTORY", history)
                    global global_msg_log
                    global_msg_log = history
                    
                    # Mute Check - Usuarios silenciados por admin
                    muted_list = db.get(f"MUTED_{cid}", [])
                    uname_at = f"@{user.get('username', '')}" if user.get('username') else ""
                    if uid in muted_list or (uname_at and uname_at in muted_list):
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]}, silent=True)
                        continue

                    # Anti-Flood Control (en memoria, sin ops SQLite)
                    if str(uid) != str(MASTER_ID):
                        flood_key = f"{cid}_{uid}"
                        now_t = time.time()
                        times = flood_cache.get(flood_key, [])
                        times = [t for t in times if now_t - t < 10]
                        times.append(now_t)
                        flood_cache[flood_key] = times
                        flood_limit = int(db.get("GLOBAL_SETTINGS", {}).get("flood_limit", 6))
                        if len(times) > flood_limit:
                            self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]}, silent=True)
                            if len(times) == flood_limit + 1:
                                self.send_msg(cid, f"ðŸŒŠ **ANTI-FLOOD:** {uname}, demasiados mensajes seguidos. Espera un momento.")
                            continue

                    if maintenance_mode and uid != str(MASTER_ID):
                        self.send_msg(cid, "âš ï¸ El bot estÃ¡ en modo mantenimiento. IntÃ©ntalo mÃ¡s tarde.")
                        continue

                    # Voice Transcription Simulation
                    if "voice" in msg:
                        voice_log.append({"time": datetime.datetime.now().strftime("%H:%M"), "user": uname})
                        self.send_msg(cid, "ðŸŽ™ï¸ [Voz detectada]: Procesando audio... (Simulado)")
                        # Simulated transcription
                        trans = "Parece que estÃ¡s hablando de " + random.choice(["tecnologÃ­a", "el grupo", "el bot", "la luna"])
                        self.send_msg(cid, f"ðŸ“ **TranscripciÃ³n:** {trans}")
                        ia_nativa.learn(trans, source=global_chat_names.get(cid, cid))

                    # Neural Vision: PercepciÃ³n Binaria Nativa
                    if "photo" in msg:
                        file_id = msg["photo"][-1]["file_id"]
                        self.send_msg(cid, "ðŸ‘ï¸ [Ojo Moon]: Analizando estructura binaria de la imagen...")
                        
                        f_info = self.api_call("getFile", {"file_id": file_id})
                        if f_info.get("ok"):
                            path = os.path.join("downloads", f"{file_id}.jpg")
                            url = f"https://api.telegram.org/file/bot{self.token}/{f_info['result']['file_path']}"
                            # Descarga con requests (estÃ¡ndar en el proyecto)
                            r = requests.get(url)
                            with open(path, 'wb') as f_out: f_out.write(r.content)
                            
                            # 1. VerificaciÃ³n de Seguridad (Huella Digital y Caption)
                            f_hash = self.get_file_hash(path)
                            self.last_media_hash = f_hash
                            caption = msg.get("caption", "")
                            visual_data = self.analyze_image(path)
                            if self.check_security_blacklist(f_hash, cid, uid, uname, caption, visual_data):
                                try: os.remove(path)
                                except: pass
                                continue
                            
                            self.send_msg(cid, f"ðŸŒŒ **PercepciÃ³n IA:** {visual_data}")
                            ia_nativa.learn(visual_data, source=global_chat_names.get(cid, cid))
                            # Incremento para Dashboard
                            db.set("STATS_PHOTOS", db.get("STATS_PHOTOS", 0) + 1)
                            try: os.remove(path)
                            except: pass
                        continue

                    # Neural Vision: PercepciÃ³n de Video Nativa (100% Antigravity Core)
                    if "video" in msg:
                        file_id = msg["video"]["file_id"]
                        self.send_msg(cid, "ðŸ‘ï¸ [Ojo Moon]: Analizando secuencia binaria de video...")
                        
                        f_info = self.api_call("getFile", {"file_id": file_id})
                        if f_info.get("ok"):
                            path = os.path.join("downloads", f"{file_id}.mp4")
                            url = f"https://api.telegram.org/file/bot{self.token}/{f_info['result']['file_path']}"
                            r = requests.get(url)
                            with open(path, 'wb') as f_out: f_out.write(r.content)
                            
                            # 1. VerificaciÃ³n de Seguridad (Huella Digital y Caption)
                            f_hash = self.get_file_hash(path)
                            self.last_media_hash = f_hash
                            caption = msg.get("caption", "")
                            video_data = self.analyze_video(path)
                            if self.check_security_blacklist(f_hash, cid, uid, uname, caption, video_data):
                                try: os.remove(path)
                                except: pass
                                continue

                            self.send_msg(cid, f"ðŸŒŒ **PercepciÃ³n IA (Video):** {video_data}")
                            ia_nativa.learn(video_data, source=global_chat_names.get(cid, cid))
                            # Incremento para Dashboard
                            db.set("STATS_VIDEOS", db.get("STATS_VIDEOS", 0) + 1)
                            try: os.remove(path)
                            except: pass
                        continue

                    # Smart AFK System
                    if str(MASTER_ID) in text and db.get("ADMIN_AFK", False):
                        self.send_msg(cid, "ðŸ’¤ **MODO AFK:** El administrador no estÃ¡ disponible ahora mismo. He registrado tu menciÃ³n.")
                        add_web_log("INFO", f"MenciÃ³n AFK registrada de {uname} en {global_chat_names.get(cid, cid)}")

                    # Admin Voice Commands (Simulated)
                    if "voice" in msg and uid == str(MASTER_ID):
                        self.send_msg(cid, "ðŸŽ™ï¸ **COMANDO DE VOZ DETECTADO:** Analizando instrucciones del Master...")
                        if random.random() > 0.5:
                            self.send_msg(cid, "âœ… AcciÃ³n ejecutada mediante voz: [Limpieza de Cache]")
                            add_web_log("ADMIN", "Limpieza de cache ejecutada por voz.")
                    
                    # Command Cooldowns
                    last_cmd = db.get(f"COOLDOWN_{uid}", 0)
                    if text.startswith("/") and time.time() - last_cmd < 1:
                        continue # 1 second cooldown
                    if text.startswith("/"): db.set(f"COOLDOWN_{uid}", time.time())
                    if "photo" in msg:
                        f = self.api_call("getFile", {"file_id": msg["photo"][-1]["file_id"]})
                        if f.get("ok"): global_media_list.append(f"https://api.telegram.org/file/bot{self.token}/{f['result']['file_path']}")
                    # Karma & Engagement System
                    sent = analyze_sentiment(text)
                    if uid not in global_user_stats: 
                        global_user_stats[uid] = {"name": uname, "count": 0, "karma": 0, "engagement": 0, "notes": ""}
                    global_user_stats[uid]["count"] += 1
                    if sent == "positive": global_user_stats[uid]["karma"] += 1
                    elif sent == "negative": global_user_stats[uid]["karma"] -= 1
                    
                    # Engagement formula: messages * karma_factor
                    global_user_stats[uid]["engagement"] = min(100, (global_user_stats[uid]["count"] * 2) + global_user_stats[uid]["karma"])
                    if cid not in global_chat_history:
                        global_chat_history[cid] = db.get(f"CHAT_HIST_{cid}", [])

                    # Cargar configuraciÃ³n local
                    cfg = db.get(f"CONFIG_{cid}", {"ia_learning": False, "auto_mod": True, "welcome": False, "anti_link": False, "clean_join": False, "ia_mood": "friendly", "anti_flood": False})

                    # Anti-Flood Logic
                    if cfg.get("anti_flood") and uid != str(MASTER_ID):
                        now = time.time()
                        f_key = f"FLOOD_{cid}_{uid}"
                        history = db.get(f_key, [])
                        history = [t for t in history if now - t < 3]
                        history.append(now)
                        db.set(f_key, history)
                        if len(history) > 5:
                            self.send_msg(cid, f"ðŸŒŠ **ANTI-FLOOD:** @{uname} silenciado por inundar el chat.")
                            self.restrict_user(cid, uid, until=int(now)+600) # 10 min
                            continue

                    # User Join tracking & Auto-Delete (Clean Join)
                    if "new_chat_members" in msg and cfg.get("clean_join"):
                        add_audit_log(f"Entrada de usuario limpiada en {global_chat_names.get(cid, cid)}")
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})

                    # 2. Caso EstÃ¡ndar (Grupos/Privados)
                    should_reply = False
                    
                    # DetecciÃ³n de Media para el Dashboard
                    media_info = None
                    if "photo" in msg:
                        media_info = {"type": "photo", "file_id": msg["photo"][-1]["file_id"]}
                    elif "video" in msg:
                        media_info = {"type": "video", "file_id": msg["video"].get("file_id")}
                    elif "voice" in msg:
                        media_info = {"type": "voice", "file_id": msg["voice"].get("file_id")}
                    elif "sticker" in msg:
                        media_info = {"type": "sticker", "file_id": msg["sticker"].get("file_id")}
                    elif "document" in msg:
                        media_info = {"type": "document", "file_id": msg["document"].get("file_id"), "name": msg["document"].get("file_name")}

                    _append_chat_hist(cid, {
                        "time": datetime.datetime.now().strftime("%H:%M"),
                        "sender": uname,
                        "uid": uid,
                        "text": text,
                        "media": media_info
                    })
                    global_chat_names[cid] = msg["chat"].get("title", uname)
                    
                    # Last Seen tracking
                    vistos = db.get("U_FILE", {})
                    vistos[cid] = {"last_seen": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "name": global_chat_names[cid]}
                    db.set("U_FILE", vistos)

                    # PROCESAMIENTO DE COMANDOS (Si empieza por /)
                    if text.startswith("/"):
                        rk = self.get_user_rank(cid, uid)
                        if self.process_command(cid, uid, uname, text, rk, msg["message_id"], msg):
                            continue
                        if not self._run_plugin_command(cid, uid, text, rk):
                            self.send_msg(cid, "Comando no reconocido. Usa /ayuda o /helpplus.")
                        continue # NUNCA pasar un comando a la IA

                    # Anti-Link per Group
                    if "http" in (text or "").lower() and cfg.get("anti_link"):
                        safe_domains = ["google.com", "github.com", "wikipedia.org"]
                        if not any(d in text.lower() for d in safe_domains):
                            self.send_msg(cid, f"ðŸš« @{uname}, los enlaces no estÃ¡n permitidos en este canal.")
                            self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})
                            continue

                    # Deep Link Scanning & Safe Search
                    if "http" in text:
                        safe_domains = ["google.com", "github.com", "wikipedia.org"]
                        if not any(d in text.lower() for d in safe_domains):
                            add_audit_log(f"Link sospechoso detectado: {text}")
                            # Simulate deep scan
                    
                    # FAQ Learning + Auto-respuesta si la pregunta se repite 3+ veces
                    if text.endswith("?"):
                        faq_key = text.lower().strip()
                        faq_db = db.get("FAQ_DB", {})
                        faq_db[faq_key] = faq_db.get(faq_key, 0) + 1
                        db.set("FAQ_DB", faq_db)
                        faq_answers = db.get("FAQ_ANSWERS", {})
                        if faq_db[faq_key] >= 3 and faq_key in faq_answers:
                            self.send_msg(cid, f"ðŸ“š **FAQ:** {faq_answers[faq_key]}")
                            continue
                    if any('\u0600' <= char <= '\u06FF' for char in text):
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})
                        continue
                    
                    # Group Link Detection
                    if "t.me/joinchat" in text or "t.me/+" in text:
                        self.send_msg(cid, "âš ï¸ Enlaces de grupos no permitidos.")
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})
                        continue
                    
                    # Profanity Filter
                    bad_words = ["spam", "scam", "crypto-offer"] # Example list
                    if any(w in text.lower() for w in bad_words):
                        self.send_msg(cid, "âš ï¸ Lenguaje no permitido.")
                        self.api_call("deleteMessage", {"chat_id": cid, "message_id": msg["message_id"]})
                        continue
                    

                    # 1. Caso Business (Modo Secretaria)
                    b_cfg = db.get("BUSINESS_CONFIG", {"ia_auto": False})
                    b_conn_id = msg.get("business_connection_id")
                    if b_conn_id and b_cfg.get("ia_auto"):
                        add_web_log("BUSINESS", f"ðŸ¤– IA Business respondiendo a {uname}...")
                        ia_res = ia_nativa.generate(text, chat_id=cid)
                        self.send_msg(cid, ia_res, business_connection_id=b_conn_id)
                        continue

                    # 2. IA Nativa (Auto-learning y respuesta)
                    ia_nativa.learn(text, source=global_chat_names.get(cid, cid))
                    
                    # Track language usage
                    lang = ia_nativa.detect_lang(text)
                    lang_counts = db.get("IA_LANG_COUNTS", {})
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
                    db.set("IA_LANG_COUNTS", lang_counts)
                    
                    rk = self.get_user_rank(cid, uid)

                    # 1. Modo Escucha (Bloquea IA y Aprendizaje, pero NO comandos arriba)
                    if listen_mode and uid != str(MASTER_ID):
                        continue
                    
                    # 2. Modo Alimentador IA (Aprende pero no responde, a menos que sea comando arriba)
                    feeder_groups = db.get("IA_FEEDERS", [])
                    if cid in feeder_groups and not text.startswith("/"):
                        add_web_log("IA", f"ðŸ§  Aprendiendo en silencio de {global_chat_names.get(cid, cid)}")
                        continue

                    # 3. ActivaciÃ³n IA por MenciÃ³n o Master (Fuera de Comandos)
                    is_ia_call = (self.bot_username in text)
                    is_master_natural = (uid == str(MASTER_ID) and not text.startswith("/"))
                    natural_translation = ia_nativa.parse_translation_request(text)
                    
                    if is_ia_call or is_master_natural or natural_translation:
                        cfg = db.get(f"CONFIG_{cid}", {"ia_mood": "friendly"})
                        clean_text = text.replace(f"@{self.bot_username}", "").strip()
                        ia_nativa.remember_context(cid, clean_text, role="user")
                        reply_text = ""
                        if msg.get("reply_to_message"):
                            reply_text = msg["reply_to_message"].get("text") or msg["reply_to_message"].get("caption", "")
                        resp = ia_nativa.answer_translation_request(clean_text, fallback_text=reply_text)
                        if not resp:
                            resp = ia_nativa.generate(clean_text, chat_id=cid, mood_override=cfg.get("ia_mood"))
                        ia_nativa.remember_context(cid, resp, role="bot")
                        self.send_msg(cid, f"ðŸŒŒ [Moon IA]: {resp}")
                        continue
                    
                    # Karma Badges assignment
                    k = global_user_stats[uid].get("karma", 0)
                    if k > 50: global_user_stats[uid]["badge"] = "ðŸ† Leyenda"
                    elif k > 20: global_user_stats[uid]["badge"] = "â­ Colaborador"
                    else: global_user_stats[uid]["badge"] = "ðŸ‘¤ Miembro"

                # --- Tareas PeriÃ³dicas de Mantenimiento ---
                self.run_periodic_maintenance()

            except Exception as e:
                logger.error(f"FATAL ERROR in Message Loop: {str(e)}")
                add_web_log("ERROR", f"Fallo en bucle de mensajes: {str(e)}")
                time.sleep(5)

def health_monitor():
    last_alert_time = 0
    while True:
        try:
            time.sleep(60)
            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory().percent
            
            if (cpu > 90 or mem > 90) and MASTER_ID != 0:
                if time.time() - last_alert_time > 600: # 10 minutos
                    msg = f"ðŸš¨ **ALERTA DE SALUD DEL SISTEMA** ðŸš¨\n\nEl servidor estÃ¡ experimentando alta carga.\n* CPU: {cpu}%\n* RAM: {mem}%"
                    if proxy_bot: proxy_bot.send_msg(MASTER_ID, msg)
                    add_web_log("WARNING", f"Alerta de salud enviada al Master. CPU: {cpu}%, RAM: {mem}%")
                    last_alert_time = time.time()
        except Exception as e:
            time.sleep(60)

proxy_bot = None

if __name__ == "__main__":
    start_time, bots_data = time.time(), []
    # Cargar bots con soporte para encriptaciÃ³n
    bots_data = token_manager.load_bots_from_file(BOT_STORE_PATH, encrypted=True)
    
    active_bots = []
    
    # Solo iniciamos hilos si NO es el reloader de Flask (para evitar duplicados)
    is_main_process = os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or MOON_ENV != "dev"
    
    if bots_data and is_main_process:
        for i, b_info in enumerate(bots_data):
            token = b_info.get("token")
            if token:
                try:
                    bot_instance = MoonBot(token)
                    active_bots.append(bot_instance)
                    add_web_log("INFO", f"Configurando bot {i+1}: @{bot_instance.bot_username}")
                except Exception as e:
                    add_web_log("ERROR", f"Fallo al iniciar bot {i+1}: {e}")

        if active_bots:
            proxy_bot = active_bots[0]
            for bot in active_bots:
                # SincronizaciÃ³n Inicial: Poblar chats conocidos
                history = db.get("GLOBAL_HISTORY", [])
                known_cids = list(set(str(m.get("cid")) for m in history if m.get("cid")))
                if known_cids:
                    tk = bot.token
                    current = db.get(f"CHATS_{tk}", [])
                    updated = list(set(current + known_cids))
                    db.set(f"CHATS_{tk}", updated)
                
                add_web_log("SUCCESS", f"Lanzando hilo para @{bot.bot_username}...")
                threading.Thread(target=bot.run, daemon=True).start()
            
            def daily_report_worker():
                """EnvÃ­a un resumen diario del crecimiento y salud del bot."""
                time.sleep(60)
                while True:
                    try:
                        now = datetime.datetime.now()
                        today = now.strftime("%Y-%m-%d")
                        last_report = db.get("LAST_DAILY_REPORT", "")
                        report_hour = int(db.get("GLOBAL_SETTINGS", {}).get("daily_report_hour", 8))
                        if last_report != today and now.hour >= report_hour:
                            if MASTER_ID:
                                ia_nativa.send_master_report("ðŸ“… RESUMEN DIARIO DE INTELIGENCIA")
                                db.set("LAST_DAILY_REPORT", today)
                                add_web_log("INFO", f"Reporte diario enviado al Administrador Maestro ({now.strftime('%H:%M')}).")
                    except Exception as e:
                        add_web_log("DEBUG", f"Error en daily_report_worker: {e}")
                    time.sleep(3600)

            def auto_backup_worker():
                """EnvÃ­a backup de la DB al Master cada N horas segÃºn GLOBAL_SETTINGS.auto_backup_hours."""
                time.sleep(120)
                while True:
                    try:
                        interval_h = int(db.get("GLOBAL_SETTINGS", {}).get("auto_backup_hours", 0))
                        if interval_h > 0 and MASTER_ID and proxy_bot:
                            last_backup = db.get("LAST_AUTO_BACKUP", 0)
                            if time.time() - last_backup >= interval_h * 3600:
                                db_path = "data/moon_database.db"
                                if os.path.exists(db_path):
                                    size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2)
                                    proxy_bot.send_document(
                                        MASTER_ID, db_path,
                                        f"ðŸ—„ï¸ Backup automÃ¡tico â€” {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} ({size_mb} MB)"
                                    )
                                    db.set("LAST_AUTO_BACKUP", time.time())
                                    add_web_log("INFO", f"Backup automÃ¡tico enviado al Master ({size_mb} MB).")
                    except Exception as e:
                        add_web_log("DEBUG", f"Error en auto_backup_worker: {e}")
                    time.sleep(3600)

            def cleanup_worker():
                """Elimina archivos de downloads/ mÃ¡s antiguos que N dÃ­as segÃºn GLOBAL_SETTINGS."""
                time.sleep(300)
                while True:
                    try:
                        days = int(db.get("GLOBAL_SETTINGS", {}).get("auto_cleanup_days", 0))
                        if days > 0:
                            for bot in active_bots.values():
                                bot.purge_old_media(days)
                    except Exception as e:
                        add_web_log("DEBUG", f"Error en cleanup_worker: {e}")
                    time.sleep(86400)

            threading.Thread(target=daily_report_worker, daemon=True).start()
            threading.Thread(target=auto_backup_worker, daemon=True).start()
            threading.Thread(target=cleanup_worker, daemon=True).start()
            threading.Thread(target=health_monitor, daemon=True).start()
        else:
            add_web_log("ERROR", "No se pudo iniciar ningÃºn bot. Verifica data/bots.json")
    
    add_web_log("INFO", f"ðŸš€ Moon Multibot Core listo ({MOON_ENV.upper()}). Iniciando Dashboard...")
    if MOON_ENV == "dev":
        app.run(host="0.0.0.0", port=FLASK_PORT, debug=True)
    else:
        from waitress import serve
        print(f"[*] SERVIDOR DE PRODUCCIÃ“N ACTIVO (Waitress) en puerto {FLASK_PORT}")
        serve(app, host="0.0.0.0", port=FLASK_PORT, threads=FLASK_THREADS)
