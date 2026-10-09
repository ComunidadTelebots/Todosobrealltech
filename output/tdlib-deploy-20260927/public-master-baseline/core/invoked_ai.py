import datetime
import hashlib
import re
import time

import requests

from core.telegram_api import extract_guest_update


def _safe_md(text):
    """Elimina marcadores Markdown desbalanceados para evitar errores de parse en Telegram."""
    for char in ("*", "_", "`"):
        if text.count(char) % 2 != 0:
            text = text.replace(char, "")
    return text


def _force_utf8(text):
    """Asegura que el texto pasa por .encode('utf-8').decode('utf-8') antes de enviarse."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text.encode("utf-8", "ignore").decode("utf-8", "ignore")


class InvokedAIService:
    def __init__(self, ia, db, ban_manager, cas_checker, log_func, bot_username="MoonBot"):
        self.ia = ia
        self.db = db
        self.ban_manager = ban_manager
        self.cas_checker = cas_checker
        self.log = log_func
        self.bot_username = bot_username or "MoonBot"
        self.guest_reply_times = {}
        self.inline_reply_times = {}
        self.inline_answer_cache = {}

    def set_bot_username(self, bot_username):
        self.bot_username = bot_username or self.bot_username

    def _record_ai_usage(self, mode, uid, uname, cid, ai_used, elapsed_time, success):
        """Registra estadísticas de uso de IA."""
        stats_key = f"INLINE_GUEST_AI_STATS"
        stats = self.db.get(stats_key, {
            "inline_total": 0,
            "guest_total": 0,
            "ollama_count": 0,
            "gemini_count": 0,
            "hybrid_count": 0,
            "markov_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "total_time": 0,
            "recent_events": []
        })

        # Actualizar contadores
        if mode == "inline":
            stats["inline_total"] += 1
        elif mode == "guest":
            stats["guest_total"] += 1

        if ai_used == "ollama":
            stats["ollama_count"] += 1
        elif ai_used == "gemini":
            stats["gemini_count"] += 1
        elif ai_used == "markov":
            stats["markov_count"] = stats.get("markov_count", 0) + 1
        else:
            stats["hybrid_count"] += 1
        
        if success:
            stats["success_count"] += 1
        else:
            stats["failed_count"] += 1
        
        stats["total_time"] += elapsed_time
        
        # Guardar evento reciente
        event = {
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mode": mode,
            "user_id": uid,
            "user_name": uname,
            "chat_id": cid,
            "ai_used": ai_used,
            "elapsed_ms": int(elapsed_time * 1000),
            "success": success
        }
        stats["recent_events"].append(event)
        
        # Mantener solo últimos 500 eventos
        if len(stats["recent_events"]) > 500:
            stats["recent_events"] = stats["recent_events"][-500:]
        
        self.db.set(stats_key, stats)

    def get_ai_statistics(self):
        """Obtiene estadísticas de uso de IA para inline y guest."""
        stats = self.db.get("INLINE_GUEST_AI_STATS", {})
        total = stats.get("inline_total", 0) + stats.get("guest_total", 0)
        avg_time = stats.get("total_time", 0) / max(1, total)
        success_rate = (stats.get("success_count", 0) / max(1, total)) * 100
        
        return {
            "summary": {
                "total_requests": total,
                "inline_requests": stats.get("inline_total", 0),
                "guest_requests": stats.get("guest_total", 0),
                "success_rate_percent": round(success_rate, 2),
                "avg_response_time_ms": round(avg_time * 1000, 2)
            },
            "ai_distribution": {
                "markov": stats.get("markov_count", 0),
                "ollama": stats.get("ollama_count", 0),
                "gemini": stats.get("gemini_count", 0),
                "hybrid": stats.get("hybrid_count", 0),
            },
            "results": {
                "success": stats.get("success_count", 0),
                "failed": stats.get("failed_count", 0)
            },
            "recent_events": stats.get("recent_events", [])[-20:]  # Últimos 20 eventos
        }

    def _search_wikipedia(self, query, lang="es"):
        """Busca en Wikipedia y devuelve un resumen breve. Fallback a inglés si no hay resultados."""
        try:
            r = requests.get(
                f"https://{lang}.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": query[:100],
                        "format": "json", "srlimit": 1, "utf8": 1},
                timeout=4
            )
            results = r.json().get("query", {}).get("search", [])
            if not results and lang != "en":
                return self._search_wikipedia(query, lang="en")
            if not results:
                return ""
            title = results[0]["title"]
            r2 = requests.get(
                f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
                timeout=4
            )
            if r2.status_code == 200:
                extract = r2.json().get("extract", "")
                if extract:
                    return f"📖 *{title}*: {extract[:500]}"
        except Exception:
            pass
        return ""

    def build_prompt(self, mode, text, uname="Usuario", context_text="", wiki_context=""):
        mode_label = "Guest Mode" if mode == "guest" else "Inline Mode"
        parts = [
            f"Modo Telegram: {mode_label}.",
            "Responde en espanol, de forma util, breve y lista para publicar en Telegram.",
            "No menciones limitaciones internas ni digas que eres un modelo.",
        ]
        if mode == "guest":
            parts.append("Has sido invocado temporalmente en un chat donde no debes asumir permisos ni historial completo.")
        else:
            parts.append("El usuario esta preparando una respuesta inline; genera texto reutilizable y claro.")
        if wiki_context:
            parts.append(f"Referencia Wikipedia (usa si es relevante): {wiki_context[:400]}")
        if context_text:
            parts.append(f"Contexto citado: {context_text[:500]}")
        parts.append(f"{uname}: {text[:700]}")
        return "\n".join(parts)

    def generate_reply(self, mode, text, uid, uname="Usuario", cid=None, context_text="", ai_preference="hybrid"):
        """
        Genera respuesta de IA con opción de seleccionar qué modelo usar.

        Args:
            ai_preference: "ollama", "gemini", o "hybrid" (default)
        """
        text = (text or "").strip() or "Crea una respuesta breve y util."
        chat_key = f"{mode}:{cid or uid}"
        wiki_context = self._search_wikipedia(text) if mode in ("inline", "guest") else ""
        prompt = self.build_prompt(mode, text, uname, context_text, wiki_context)
        
        start_time = time.time()
        answer = ""
        ai_used = "unknown"
        
        try:
            answer = (self.ia.generate(prompt[:1000], chat_id=chat_key, ai_preference=ai_preference) or "").strip()
            ai_used = ai_preference if ai_preference in ("ollama", "gemini", "markov") else "hybrid"
        except TypeError:
            # Fallback si generate() no soporta ai_preference (versión antigua)
            answer = (self.ia.generate(prompt[:1000], chat_id=chat_key) or "").strip()
            ai_used = "hybrid"
        except Exception as e:
            self.log("ERROR", f"Error generando respuesta: {e}")
            answer = ""
        
        elapsed_time = time.time() - start_time
        
        if not answer:
            answer = "Estoy listo. Dame un poco mas de contexto y te respondo mejor."

        answer = _force_utf8(_safe_md(answer))
        # Registrar estadísticas
        self._record_ai_usage(mode, uid, uname, cid, ai_used, elapsed_time, len(answer) > 0)

        return answer[:3500], ai_used

    def is_user_blocked_for_remote_ai(self, uid):
        if self.ban_manager.is_global_banned(uid):
            return True
        settings = self.db.get("GLOBAL_SETTINGS", {})
        if settings.get("cas_protection", "on") != "on":
            return False
        cas_status = self.cas_checker(uid)
        return bool(cas_status.get("banned"))

    def _extract_ai_preference(self, text):
        """
        Extrae la preferencia de IA del texto.
        Soporta: /ollama, /gemini, /hybrid o por defecto devuelve la preferencia global.
        """
        text_lower = (text or "").lower()

        if text_lower.startswith("/markov"):
            return "markov"
        elif text_lower.startswith("/ollama"):
            return "ollama"
        elif text_lower.startswith("/gemini"):
            return "gemini"

        settings = self.db.get("GLOBAL_SETTINGS", {})
        default_ai = settings.get("default_ai_mode", "markov")
        return default_ai if default_ai in ["markov", "ollama", "gemini"] else "markov"

    def build_inline_results(self, query, answer, wiki_text=""):
        digest = hashlib.sha1(f"{query}|{answer}|{time.time()}".encode("utf-8")).hexdigest()[:16]
        short_answer = answer[:180]
        concise = answer[:900]
        refined_prompt = (
            "Necesito una respuesta clara para Telegram sobre: "
            f"{(query or 'esta idea')[:700]}. "
            "Incluye puntos concretos, evita relleno y termina con una accion util."
        )
        results = [
            {
                "type": "article",
                "id": f"moon_ai_{digest}",
                "title": "🤖 Respuesta IA",
                "description": short_answer,
                "input_message_content": {
                    "message_text": answer[:4096],
                    "parse_mode": "Markdown",
                },
            },
            {
                "type": "article",
                "id": f"moon_ai_short_{digest}",
                "title": "✂️ Respuesta breve",
                "description": concise[:120],
                "input_message_content": {
                    "message_text": concise,
                    "parse_mode": "Markdown",
                },
            },
        ]
        if wiki_text:
            results.append({
                "type": "article",
                "id": f"moon_wiki_{digest}",
                "title": "📖 Wikipedia",
                "description": wiki_text[:120],
                "input_message_content": {
                    "message_text": wiki_text[:4096],
                    "parse_mode": "Markdown",
                },
            })
        results.append({
            "type": "article",
            "id": f"moon_ai_prompt_{digest}",
            "title": "✏️ Mejorar prompt",
            "description": "Convierte la idea en una peticion mas clara para el chat.",
            "input_message_content": {
                "message_text": refined_prompt,
                "parse_mode": "Markdown",
            },
        })
        return results

    def get_cached_inline_answer(self, query, uid, uname, ai_preference="hybrid"):
        cache_key = f"{uid}:{query.lower().strip()}:{ai_preference}"
        now_s = time.time()
        cached = self.inline_answer_cache.get(cache_key)
        if cached and now_s - cached["time"] < 20:
            return cached["answer"], cached.get("ai_used", "hybrid")
        
        answer, ai_used = self.generate_reply("inline", query, uid or "inline", uname=uname, ai_preference=ai_preference)
        self.inline_answer_cache[cache_key] = {"time": now_s, "answer": answer, "ai_used": ai_used}
        
        if len(self.inline_answer_cache) > 200:
            oldest = sorted(self.inline_answer_cache.items(), key=lambda item: item[1]["time"])[:50]
            for key, _ in oldest:
                self.inline_answer_cache.pop(key, None)
        
        return answer, ai_used

    def answer_inline_query(self, update, answer_inline_query):
        inline = update.get("inline_query")
        if not inline:
            return False
        query_id = inline.get("id")
        user = inline.get("from", {})
        uid = str(user.get("id", ""))
        uname = user.get("first_name", "Usuario")
        query = (inline.get("query") or "").strip()
        if not query_id:
            return True

        key = f"inline:{uid}"
        now_s = time.time()
        if now_s - self.inline_reply_times.get(key, 0) < 3:
            answer_inline_query(query_id, [], cache_time=1)
            return True
        self.inline_reply_times[key] = now_s

        if uid and self.is_user_blocked_for_remote_ai(uid):
            answer_inline_query(query_id, [], cache_time=10)
            self.log("SECURITY", f"Inline IA bloqueada para usuario baneado/CAS {uid}.")
            return True

        try:
            # Detectar preferencia de IA del query (ej: "/ollama", "/gemini")
            ai_preference = self._extract_ai_preference(query)
            answer, ai_used = self.get_cached_inline_answer(query, uid or "inline", uname, ai_preference=ai_preference)
            wiki_text = self._search_wikipedia(query) if query else ""
            results = self.build_inline_results(query or "Moon IA", answer, wiki_text=wiki_text)
            answer_inline_query(query_id, results, cache_time=2, is_personal=True)
            self.log("IA", f"Inline IA respondida para {uname} ({uid}) usando {ai_used}{'+ Wikipedia' if wiki_text else ''}.")
        except Exception as e:
            self.log("ERROR", f"Fallo procesando inline IA: {e}")
            answer_inline_query(query_id, [], cache_time=1)
        return True

    def record_chosen_inline_result(self, update):
        chosen = update.get("chosen_inline_result")
        if not chosen:
            return False
        events = self.db.get("INLINE_AI_CHOICES", [])
        events.append({
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "result_id": chosen.get("result_id"),
            "query": chosen.get("query", "")[:300],
            "user_id": str(chosen.get("from", {}).get("id", "")),
        })
        self.db.set("INLINE_AI_CHOICES", events[-100:])
        return True

    def answer_guest_update(self, update, send_msg, enforce_existing_ban, enforce_cas_ban):
        field, guest = extract_guest_update(update)
        if not guest:
            return False
        msg = guest.get("message") or guest.get("summoning_message") or guest
        if not isinstance(msg, dict) or "chat" not in msg:
            events = self.db.get("GUEST_BOT_UPDATES", [])
            events.append({"time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "field": field, "update": guest})
            self.db.set("GUEST_BOT_UPDATES", events[-100:])
            self.log("INFO", f"Guest Bot update registrado ({field}) sin mensaje ejecutable.")
            return True

        cid = str(msg["chat"]["id"])
        user = msg.get("from", {})
        uid = str(user.get("id", cid))
        uname = user.get("first_name", "Guest")
        text = msg.get("text") or msg.get("caption") or ""
        text = re.sub(rf"@{re.escape(self.bot_username)}\b", "", text, flags=re.IGNORECASE).strip()
        if not text:
            text = "Responde de forma breve y util a esta invocacion."

        key = f"{cid}:{uid}"
        now_s = time.time()
        if now_s - self.guest_reply_times.get(key, 0) < 5:
            self.log("DEBUG", f"Guest Bot rate limit para {key}")
            return True
        self.guest_reply_times[key] = now_s

        if enforce_existing_ban(cid, uid, uname, msg.get("message_id")):
            return True
        if enforce_cas_ban(cid, uid, uname, msg.get("message_id")):
            return True

        try:
            quoted = msg.get("reply_to_message", {}).get("text", "") if msg.get("reply_to_message") else ""
            ai_preference = self._extract_ai_preference(text)
            answer, ai_used = self.generate_reply("guest", text, uid, uname=uname, cid=cid, context_text=quoted, ai_preference=ai_preference)
            send_msg(cid, answer)
            self.log("INFO", f"Guest Bot respondio en {cid} a {uname} usando {ai_used}.")
        except Exception as e:
            self.log("ERROR", f"Fallo procesando Guest Bot update: {e}")
        return True
