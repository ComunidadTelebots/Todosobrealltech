"""Explicit per-bot routing to the official, TDLib-backed Bot API server."""
import os
import re
from urllib.parse import urlsplit, quote

CLOUD = 'https://api.telegram.org'


def api_root(token):
    selected = {part.strip() for part in os.getenv('MOON_LOCAL_BOT_IDS', '').split(',') if part.strip()}
    if '*' not in selected and str(token).split(':', 1)[0] not in selected:
        return CLOUD
    configured = os.getenv('MOON_BOT_API_URL', '').rstrip('/')
    parsed = urlsplit(configured)
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or
            parsed.password or parsed.query or parsed.fragment or parsed.path):
        raise ValueError('MOON_BOT_API_URL must be an HTTP(S) origin without credentials or path')
    return configured


def bot_api_url(token):
    return f'{api_root(token)}/bot{token}/'


def bot_file_url(token, file_path):
    # Local mode absolute file paths need a separate, explicitly shared volume.
    # This integration uses the server's standard HTTP file interface instead.
    if not isinstance(file_path, str) or file_path.startswith(('/', '\\')) or '\\' in file_path or any(part == '..' for part in file_path.split('/')) or '://' in file_path:
        raise ValueError('Unsupported Telegram file path')
    return f'{api_root(token)}/file/bot{token}/{quote(file_path, safe="/")}'


def uses_local_api(token):
    return api_root(token) != CLOUD


def canonical_bot_url(url):
    match = re.fullmatch(r'/bot([^/]+)/', urlsplit(url).path)
    return f'{CLOUD}/bot{match.group(1)}/' if match else url
