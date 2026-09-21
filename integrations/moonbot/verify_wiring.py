import unittest
from unittest.mock import Mock, patch
import requests
from core.telegram_api import telegram_api_call
from core.operations_telemetry import OperationsTelemetry


class WiringTest(unittest.TestCase):
    def test_rate_limit_retry_is_counted_once_per_attempt(self):
        monitor = OperationsTelemetry()
        session = Mock()
        session.post.side_effect = [Mock(json=lambda: {'ok': False, 'error_code': 429, 'parameters': {'retry_after': 2}}), Mock(json=lambda: {'ok': True, 'result': {'message_id': 1}})]
        with patch('core.telegram_api.telemetry', monitor), patch('core.telegram_api.time.sleep') as sleep:
            result = telegram_api_call(session, 'http://test/', 'sendMessage')
        self.assertTrue(result['ok'])
        sleep.assert_called_once_with(2)
        self.assertEqual(monitor.snapshot()['total']['calls'], 2)
        self.assertEqual(monitor.snapshot()['total']['limited'], 1)
        self.assertEqual(monitor.snapshot()['total']['sent'], 1)

    def test_timeouts_are_observed_without_changing_retry_count(self):
        monitor = OperationsTelemetry()
        session = Mock()
        session.post.side_effect = requests.exceptions.Timeout()
        with patch('core.telegram_api.telemetry', monitor), patch('core.telegram_api.time.sleep'):
            result = telegram_api_call(session, 'http://test/', 'getUpdates')
        self.assertFalse(result['ok'])
        self.assertEqual(session.post.call_count, 3)
        self.assertEqual(monitor.snapshot()['total']['timeouts'], 3)

    def test_invalid_json_records_failure(self):
        monitor = OperationsTelemetry()
        session = Mock()
        response = Mock(status_code=502)
        response.json.side_effect = ValueError()
        session.post.return_value = response
        with patch('core.telegram_api.telemetry', monitor):
            result = telegram_api_call(session, 'http://test/', 'getUpdates')
        self.assertFalse(result['ok'])
        self.assertEqual(monitor.snapshot()['total']['errors'], 1)


if __name__ == '__main__':
    unittest.main()
