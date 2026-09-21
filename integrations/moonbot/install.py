"""Apply the small telemetry integration to a reviewed Moonbot checkout.

Usage: python integrations/moonbot/install.py PATH_TO_MOONBOT
Fails before writing if expected integration points have changed.
"""
from pathlib import Path
import sys


def build_changes(root):
    main_path = root / 'moon_multibot.py'
    api_path = root / 'core' / 'telegram_api.py'
    main = main_path.read_text(encoding='utf-8')
    api = api_path.read_text(encoding='utf-8')
    marker = 'from core.operations_telemetry import'
    if marker in main or marker in api:
        raise ValueError('La integración ya existe o está parcialmente aplicada. Revisa git diff.')
    anchor = '@app.route("/health")'
    if main.count(anchor) != 1:
        raise ValueError('No se encontró el punto de integración de Flask esperado')
    main = main.replace(anchor, 'from core.operations_telemetry import install_http_telemetry\ninstall_http_telemetry(app, check_jwt)\n\n' + anchor)
    replacements = [
        ('import requests\n', 'import requests\nfrom core.operations_telemetry import telemetry\n'),
        ('    for attempt in range(_retries):\n        try:', '    for attempt in range(_retries):\n        attempt_started = time.monotonic()\n        try:'),
        ('            except ValueError:\n                return {', '            except ValueError:\n                telemetry.telegram(base_url, method, {}, (time.monotonic() - attempt_started) * 1000)\n                return {'),
        ('            if not isinstance(data, dict):\n                return', '            if not isinstance(data, dict):\n                telemetry.telegram(base_url, method, {}, (time.monotonic() - attempt_started) * 1000)\n                return'),
        ('            # Manejo de rate limit 429:', '            telemetry.telegram(base_url, method, data, (time.monotonic() - attempt_started) * 1000)\n            # Manejo de rate limit 429:'),
        ('        except requests.exceptions.ConnectionError:\n', '        except requests.exceptions.ConnectionError:\n            telemetry.telegram(base_url, method, {}, (time.monotonic() - attempt_started) * 1000)\n'),
        ('        except requests.exceptions.Timeout:\n', '        except requests.exceptions.Timeout:\n            telemetry.telegram(base_url, method, {}, (time.monotonic() - attempt_started) * 1000, timeout=True)\n'),
        ('        except requests.exceptions.RequestException as exc:\n', '        except requests.exceptions.RequestException as exc:\n            telemetry.telegram(base_url, method, {}, (time.monotonic() - attempt_started) * 1000)\n'),
    ]
    for old, new in replacements:
        if api.count(old) != 1:
            raise ValueError('Ha cambiado telegram_api.py; revisar la integración antes de aplicar')
        api = api.replace(old, new)
    module = Path(__file__).with_name('operations_telemetry.py').read_text(encoding='utf-8')
    return {main_path: main, api_path: api, root / 'core' / 'operations_telemetry.py': module}


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Uso: python install.py RUTA_MOONBOT')
    changes = build_changes(Path(sys.argv[1]).resolve())
    for file, source in changes.items():
        compile(source.lstrip('\ufeff'), str(file), 'exec')
    for file, source in changes.items():
        file.write_text(source, encoding='utf-8', newline='\n')
    print('Telemetría instalada en el checkout. Revisa git diff antes de desplegar.')
