"""Read-only migration readiness; never publishes credentials or message content."""
import json
import hmac
import os
from pathlib import Path
from core.traffic_control import identity
from core.bot_endpoint import uses_local_api


def migration_authorized(request, jwt_validator):
    """Read-only telemetry uses the existing private service key or dashboard JWT."""
    expected = os.getenv('MOON_ADMIN_API_KEY', '').strip()
    supplied = request.headers.get('X-Moon-Admin-Key', '').strip()
    if expected and supplied and hmac.compare_digest(expected.encode(), supplied.encode()):
        return True
    return bool(jwt_validator(request))


def migration_snapshot(bots, configured):
    try:
        report = json.loads((Path(__file__).resolve().parents[1] / 'TDLIB_COMPATIBILITY.json').read_text(encoding='utf-8-sig'))
        summary = report['summary']
    except (OSError, ValueError, KeyError):
        summary = None
    bots = list(bots)
    rows = []
    for bot in bots[:200]:
        client = getattr(bot, '_tdlib', None)
        error = None
        try:
            status = client.get_status() if client else {}
            if not isinstance(status, dict):
                raise ValueError('Invalid status')
        except Exception:
            status = {}
            error = 'session_status_unavailable'
        try:
            local = uses_local_api(bot.token) if getattr(bot, 'token', None) else False
        except ValueError:
            local = None
            error = 'invalid_gateway_configuration'
        rows.append({'id': identity(bot.url), 'loaded': status.get('loaded', False),
                     'ready': status.get('ready', False), 'running': status.get('running', False),
                     'receiver': status.get('receiver'), 'incoming': 'unknown' if local is None else 'local_bot_api_tdlib' if local else 'bot_api',
                     'issue': error,
                     'auth_state': status.get('auth_state', 'not_configured')})
    inbox = {'enabled': False}
    inbox_path = os.getenv('MOON_INBOX_PATH', '')
    if inbox_path:
        try:
            if not Path(inbox_path).is_file():
                raise ValueError('Not initialized')
            from core.persistent_inbox import PersistentInbox
            inbox = {'enabled': True, **PersistentInbox(inbox_path).stats()}
        except Exception:
            inbox = {'enabled': True, 'error': 'Cola no disponible'}
    return {'ok': True, 'schema': 1, 'configured': bool(configured), 'inbox': inbox,
            'ready_for_full_migration': False, 'audit': summary, 'bots': rows,
            'bots_truncated': len(bots) > 200}
