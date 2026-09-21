import json
from pathlib import Path
import tempfile
import unittest
from operations_telemetry import OperationsTelemetry
from install import build_changes
from operations_telemetry import install_http_telemetry
from flask import Flask


class TelemetryTest(unittest.TestCase):
    def setUp(self):
        self.now = 120.0
        self.telemetry = OperationsTelemetry(lambda: self.now)

    def test_received_updates_and_duplicate_delivery(self):
        data = {'ok': True, 'result': [{'update_id': 1, 'message': {'text': 'PRIVATE'}},
                                      {'update_id': 2, 'callback_query': {}},
                                      {'update_id': 3, 'edited_message': {}}]}
        for _ in range(2):
            self.telemetry.telegram('SECRET_BOT_TOKEN', 'getUpdates', data, 20)
        result = self.telemetry.snapshot()
        self.assertEqual(result['total']['received'], 1)
        self.assertEqual(result['total']['updates'], 3)
        self.assertEqual(result['total']['calls'], 2)
        self.assertNotIn('SECRET', json.dumps(result))
        self.assertNotIn('PRIVATE', json.dumps(result))

    def test_same_update_id_from_other_bot_is_a_separate_delivery(self):
        for bot in ['a', 'b']:
            self.telemetry.telegram(bot, 'getUpdates', {'ok': True, 'result': [{'update_id': 1, 'message': {}}]}, 2)
        self.assertEqual(self.telemetry.snapshot()['total']['received'], 2)

    def test_successful_album_counts_messages_not_requests(self):
        self.telemetry.telegram('bot', 'sendMediaGroup', {'ok': True, 'result': [{'message_id': 1}, {'message_id': 2}]}, 30)
        self.telemetry.telegram('bot', 'editMessageText', {'ok': True, 'result': {'message_id': 1}}, 10)
        self.assertEqual(self.telemetry.snapshot()['total']['sent'], 2)

    def test_limits_timeouts_and_window_expiration(self):
        self.telemetry.telegram('bot', 'sendMessage', {'ok': False, 'error_code': 429, 'parameters': {'retry_after': 12}}, 25)
        self.telemetry.telegram('bot', 'getUpdates', {}, 35000, timeout=True)
        self.telemetry.http(503)
        result = self.telemetry.snapshot()
        self.assertEqual(result['last60s']['limited'], 1)
        self.assertEqual(result['last60s']['timeouts'], 1)
        self.assertEqual(result['last60s']['retry_after_max'], 12)
        self.now += 61
        self.assertEqual(self.telemetry.snapshot()['last60s']['calls'], 0)
        self.assertEqual(self.telemetry.snapshot()['total']['calls'], 2)
        self.now += 3600
        self.assertEqual(len(self.telemetry.snapshot()['history']), 60)
        self.assertEqual(len(self.telemetry.minutes), 0)

    def test_installer_checks_all_anchors_before_modifying_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'core').mkdir()
            (root / 'moon_multibot.py').write_text('changed', encoding='utf-8')
            (root / 'core' / 'telegram_api.py').write_text('changed', encoding='utf-8')
            with self.assertRaises(ValueError):
                build_changes(root)
            self.assertEqual((root / 'moon_multibot.py').read_text(), 'changed')

    def test_http_endpoint_requires_existing_authentication(self):
        app = Flask(__name__)
        install_http_telemetry(app, lambda req: req.headers.get('Authorization') == 'Bearer TEST')
        client = app.test_client()
        self.assertEqual(client.get('/api/telemetry/operations').status_code, 401)
        response = client.get('/api/telemetry/operations', headers={'Authorization': 'Bearer TEST'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertEqual(response.json['schema'], 1)
        self.assertNotIn('TEST', response.text)


if __name__ == '__main__':
    unittest.main()
