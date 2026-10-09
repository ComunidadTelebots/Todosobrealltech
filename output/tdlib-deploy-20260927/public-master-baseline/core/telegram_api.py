import time
import requests


TELEGRAM_BOT_API_VERSION = "10.1"

DEPRECATED_METHOD_ALIASES = {
    "kickChatMember": "banChatMember",
}

DEFAULT_ALLOWED_UPDATES = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    "business_connection",
    "business_message",
    "edited_business_message",
    "deleted_business_messages",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    "my_chat_member",
    "chat_member",
    "chat_join_request",
    "chat_boost",
    "removed_chat_boost",
    "purchased_paid_media",
    "poll",
    "poll_answer",
    "message_reaction",
    "message_reaction_count",
]

GUEST_UPDATE_FIELDS = (
    "guest_message",
    "guest_interaction",
    "guest_bot",
)


def normalize_method(method):
    return DEPRECATED_METHOD_ALIASES.get(method, method)


def telegram_api_call(session, base_url, method, params=None, files=None, timeout=35, _retries=3):
    method = normalize_method(method)
    params = params or {}
    for attempt in range(_retries):
        try:
            if files:
                response = session.post(base_url + method, data=params, files=files, timeout=timeout)
            else:
                response = session.post(base_url + method, json=params, timeout=timeout)
            try:
                data = response.json()
            except ValueError:
                return {
                    "ok": False,
                    "description": f"Telegram returned non-JSON response ({response.status_code})",
                }
            if not isinstance(data, dict):
                return {"ok": False, "description": "Telegram returned an invalid payload"}
            # Manejo de rate limit 429: esperar retry_after y reintentar
            if not data.get("ok") and data.get("error_code") == 429:
                retry_after = data.get("parameters", {}).get("retry_after", 5)
                time.sleep(retry_after)
                continue
            return data
        except requests.exceptions.ConnectionError:
            if attempt < _retries - 1:
                time.sleep(2 ** attempt)
                continue
            return {"ok": False, "description": "Connection error after retries"}
        except requests.exceptions.Timeout:
            if attempt < _retries - 1:
                time.sleep(2 ** attempt)
                continue
            return {"ok": False, "description": "Timeout after retries"}
        except requests.exceptions.RequestException as exc:
            return {"ok": False, "description": str(exc)}
    return {"ok": False, "description": "Max retries exceeded"}


def build_get_updates_payload(offset, timeout=20, allowed_updates=None):
    return {
        "offset": offset + 1,
        "timeout": timeout,
        "allowed_updates": allowed_updates or DEFAULT_ALLOWED_UPDATES,
    }


def extract_guest_update(update):
    for field in GUEST_UPDATE_FIELDS:
        value = update.get(field)
        if isinstance(value, dict):
            return field, value
    return None, None
