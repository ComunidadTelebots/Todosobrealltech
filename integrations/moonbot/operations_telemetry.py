"""Bounded process counters. Never retain message bodies, tokens or chat IDs."""
from collections import OrderedDict
from datetime import datetime, timezone
import hashlib
import math
import threading
import time


KEYS = ('updates', 'received', 'sent', 'calls', 'errors', 'limited', 'timeouts',
        'http', 'http_errors', 'retry_after_max', 'latency_ms')


def timestamp(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat()


class OperationsTelemetry:
    def __init__(self, clock=time.time):
        self.clock = clock
        self.started = clock()
        self.lock = threading.Lock()
        self.total = dict.fromkeys(KEYS, 0)
        self.seconds = {}
        self.minutes = {}
        self.seen = OrderedDict()

    def _prune(self):
        now = self.clock()
        self.seconds = {k: v for k, v in self.seconds.items() if k > int(now) - 60}
        self.minutes = {k: v for k, v in self.minutes.items() if k > int(now // 60) - 60}

    def _add(self, **values):
        self._prune()
        now = self.clock()
        second = self.seconds.setdefault(int(now), dict.fromkeys(KEYS, 0))
        minute = self.minutes.setdefault(int(now // 60), dict.fromkeys(KEYS, 0))
        for bucket in (self.total, second, minute):
            for key, value in values.items():
                bucket[key] = max(bucket[key], value) if key == 'retry_after_max' else bucket[key] + value

    def telegram(self, base_url, method, data, elapsed_ms, timeout=False):
        data = data if isinstance(data, dict) else {}
        ok = data.get('ok') is True
        limited = data.get('error_code') == 429
        parameters = data.get('parameters')
        retry = parameters.get('retry_after', 0) if limited and isinstance(parameters, dict) else 0
        retry = retry if isinstance(retry, (int, float)) and math.isfinite(retry) and retry >= 0 else 0
        updates = received = sent = 0
        with self.lock:
            if ok and method == 'getUpdates' and isinstance(data.get('result'), list):
                bot = hashlib.sha256(base_url.encode()).digest()
                for update in data['result']:
                    if not isinstance(update, dict) or not isinstance(update.get('update_id'), int):
                        continue
                    key = (bot, update['update_id'])
                    if key in self.seen:
                        continue
                    self.seen[key] = True
                    while len(self.seen) > 10000:
                        self.seen.popitem(last=False)
                    updates += 1
                    received += int(any(isinstance(update.get(kind), dict) for kind in ('message', 'channel_post', 'business_message', 'guest_message')))
            if ok and (method.startswith('send') or method in ('forwardMessage', 'forwardMessages', 'copyMessage', 'copyMessages')):
                results = data.get('result')
                results = results if isinstance(results, list) else [results]
                sent = sum(isinstance(row, dict) and 'message_id' in row for row in results)
            self._add(calls=1, errors=int(not ok), limited=int(limited), timeouts=int(timeout),
                      retry_after_max=retry, latency_ms=max(0, elapsed_ms), updates=updates, received=received, sent=sent)

    def http(self, status):
        with self.lock:
            self._add(http=1, http_errors=int(status >= 400))

    def snapshot(self):
        with self.lock:
            self._prune()
            recent = dict.fromkeys(KEYS, 0)
            for bucket in self.seconds.values():
                for key, value in bucket.items():
                    recent[key] = max(recent[key], value) if key == 'retry_after_max' else recent[key] + value
            minute = int(self.clock() // 60)
            history = [{'at': timestamp(key * 60), **self.minutes.get(key, dict.fromkeys(KEYS, 0))}
                       for key in range(max(int(self.started // 60), minute - 59), minute + 1)]
            return {'ok': True, 'schema': 1, 'since': timestamp(self.started),
                    'total': dict(self.total), 'last60s': recent, 'history': history}


telemetry = OperationsTelemetry()


def install_http_telemetry(app, check_jwt):
    from flask import jsonify, request

    @app.after_request
    def count_http(response):
        telemetry.http(response.status_code)
        return response

    @app.route('/api/telemetry/operations')
    def operations_snapshot():
        if not check_jwt(request):
            return jsonify({'ok': False}), 401
        response = jsonify(telemetry.snapshot())
        response.headers['Cache-Control'] = 'no-store'
        return response
