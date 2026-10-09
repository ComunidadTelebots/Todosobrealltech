"""Persistent per-node Bot API admission control. One Python writer per node."""
import hashlib
import json
import os
import re
import threading
from contextlib import contextmanager
from pathlib import Path
from core.bot_endpoint import canonical_bot_url


def identity(url):
    return hashlib.sha256(canonical_bot_url(url).encode()).hexdigest()[:12]


class TrafficControl:
    def __init__(self, filename=None, node=None, default_paused=None):
        self.node = node if node is not None else os.getenv('MOON_NODE_ID', '')
        self.enabled = bool(re.fullmatch(r'[a-zA-Z0-9_-]{1,64}', self.node)) and (node is not None or os.getenv('MOON_TRAFFIC_CONTROL_ENABLED', 'false').lower() == 'true')
        self.path = Path(filename or f'data/traffic-{self.node or "unconfigured"}.json')
        self.default_paused = default_paused if default_paused is not None else os.getenv('MOON_TRAFFIC_DEFAULT_PAUSED', 'true').lower() != 'false'
        self.lock = threading.RLock()
        self.local = threading.local()
        self.state = None
        self.inflight = {}
        self.offsets = {}

    def read(self):
        if self.state is not None:
            return
        try:
            value = json.loads(self.path.read_text(encoding='utf-8'))
            if value.get('node') != self.node or not isinstance(value.get('bots'), dict):
                raise ValueError('Invalid traffic state')
            self.state = value
            if os.getenv('MOON_TRAFFIC_BOOT_PAUSED', 'false').lower() == 'true':
                for entry in self.state['bots'].values():
                    entry['paused'] = True
                    entry['revision'] = entry.get('revision', 0) + 1
                self.save()
        except FileNotFoundError:
            self.state = {'node': self.node, 'bots': {}}

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.state), encoding='utf-8')
        os.replace(temporary, self.path)

    def status(self, bot_id):
        with self.lock:
            self.read()
            entry = self.state['bots'].get(bot_id, {})
            return dict(id=bot_id, paused=entry.get('paused', self.default_paused),
                        revision=entry.get('revision', 0), inflight=self.inflight.get(bot_id, 0),
                        offset=self.offsets.get(bot_id, entry.get('offset', 0)))

    def change(self, bot_id, paused, revision, offset=None):
        if not self.enabled or not re.fullmatch('[a-f0-9]{12}', bot_id):
            raise ValueError('Traffic control is not configured')
        with self.lock:
            old = self.status(bot_id)
            if type(revision) is not int or revision != old['revision']:
                raise ValueError('Traffic policy changed; refresh')
            if not paused and old['inflight']:
                raise ValueError('Bot is still draining')
            if offset is not None and (type(offset) is not int or offset < 0):
                raise ValueError('Invalid checkpoint')
            entry = dict(paused=bool(paused), revision=revision + 1, offset=old['offset'] if offset is None else offset)
            previous = self.state['bots'].get(bot_id)
            self.state['bots'][bot_id] = entry
            try:
                self.save()
            except Exception:
                if previous is None:
                    self.state['bots'].pop(bot_id, None)
                else:
                    self.state['bots'][bot_id] = previous
                raise
            self.offsets[bot_id] = entry['offset']
            return self.status(bot_id)

    @contextmanager
    def admit(self, url):
        if not self.enabled:
            yield True
            return
        bot_id = identity(url)
        depth = getattr(self.local, 'depth', {})
        with self.lock:
            try:
                permitted = bool(depth.get(bot_id)) or not self.status(bot_id)['paused']
            except Exception:
                permitted = False
            if permitted:
                self.inflight[bot_id] = self.inflight.get(bot_id, 0) + 1
                depth[bot_id] = depth.get(bot_id, 0) + 1
                self.local.depth = depth
        try:
            yield permitted
        finally:
            if permitted:
                with self.lock:
                    self.inflight[bot_id] -= 1
                    depth[bot_id] -= 1

    def checkpoint(self, url, offset):
        if not self.enabled:
            return
        with self.lock:
            bot_id = identity(url)
            self.offsets[bot_id] = offset
            if self.status(bot_id)['paused'] and bot_id in self.state['bots']:
                self.state['bots'][bot_id]['offset'] = offset
                self.save()

    def offset(self, url, fallback=0):
        return self.status(identity(url))['offset'] if self.enabled else fallback


traffic_control = TrafficControl()


def guard_api(function):
    def wrapped(session, base_url, *args, **kwargs):
        with traffic_control.admit(base_url) as permitted:
            if not permitted:
                return {'ok': False, 'error_code': 503, 'description': 'Bot traffic paused', 'traffic_paused': True}
            return function(session, base_url, *args, **kwargs)
    return wrapped


def guard_bot_send(function):
    def wrapped(bot, *args, **kwargs):
        with traffic_control.admit(bot.url) as permitted:
            if not permitted:
                return False
            return function(bot, *args, **kwargs)
    return wrapped
