#!/usr/bin/env python3
"""Read bounded Docker/systemd diagnostics and publish them locally."""
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request

ROOT = Path('/var/lib/alltech-observability')
PURPOSES = Path('/opt/alltech-observability/purpose.json')
BASELINE = Path('/etc/alltech-observability/expected.json')
LOKI = 'http://127.0.0.1:13100/loki/api/v1/push'
MAX_LINES = 120
SECRET = re.compile(
    r'authorization|bearer\s|password|passwd|contrase[nñ]a|secret|api[-_ ]?key|'
    r'access[-_ ]?token|refresh[-_ ]?token|set-cookie|private key|\btoken\b|bot\d{7,}:',
    re.I,
)
EMAIL = re.compile(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')


def command(*args):
    result = subprocess.run(args, capture_output=True, text=True, errors='replace', timeout=12)
    if result.returncode:
        raise RuntimeError(f'{args[0]} {args[1]} falló ({result.returncode})')
    return result


def collect_inventory():
    containers = [
        json.loads(line)
        for line in command('docker', 'ps', '-a', '--no-trunc', '--format', '{{json .}}').stdout.splitlines()
    ]
    units = {}
    output = command('systemctl', 'list-units', '--all', '--type=service', '--plain',
                     '--no-legend', '--no-pager').stdout
    for line in output.splitlines():
        name, _, active, *_ = line.split()
        units[name] = active
    return containers, units


def write_atomic(path, content):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(content, encoding='utf-8')
    tmp.chmod(0o644)
    tmp.replace(path)


def label_value(value):
    return json.dumps(value, ensure_ascii=False)


def metrics(containers, units, baseline, purposes):
    lines = ['alltech_collector_last_success_seconds ' + str(int(time.time()))]
    for entry in containers:
        name, state, status = entry['Names'], entry['State'], entry['Status']
        health = ('unhealthy' if '(unhealthy)' in status else
                  'healthy' if '(healthy)' in status else
                  'starting' if '(health: starting)' in status else 'sin_healthcheck')
        purpose = next((text for match, text in purposes.items() if re.search(match, name)), 'Por documentar')
        labels = f'container={label_value(name)},purpose={label_value(purpose)}'
        lines.append(f'alltech_docker_state{{{labels},state={label_value(state)},health={label_value(health)}}} 1')
        if name not in baseline['containers'] and state == 'running':
            lines.append(f'alltech_unexpected_workload{{source="docker",service={label_value(name)}}} 1')
    for name, state in units.items():
        lines.append(f'alltech_systemd_state{{unit={label_value(name)},state={label_value(state)}}} 1')
        if name not in baseline['units'] and state == 'active':
            lines.append(f'alltech_unexpected_workload{{source="systemd",service={label_value(name)}}} 1')
    stats = command('docker', 'stats', '--no-stream', '--format', '{{json .}}').stdout
    for line in stats.splitlines():
        entry = json.loads(line)
        labels = f'container={label_value(entry["Name"])}'
        for key, metric in [('CPUPerc', 'cpu'), ('MemPerc', 'memory')]:
            value = entry[key].removesuffix('%')
            if re.fullmatch(r'\d+(?:\.\d+)?', value):
                lines.append(f'alltech_docker_{metric}_percent{{{labels}}} {value}')
    for row in Path('/proc/net/dev').read_text().splitlines()[2:]:
        iface, _, raw = row.partition(':')
        rx, *_, tx, _a, _b, _c, _d, _e, _f, _g = raw.split()
        key = f'interface={label_value(iface.strip())}'
        lines.append(f'alltech_network_received_bytes_total{{{key}}} {rx}')
        lines.append(f'alltech_network_transmitted_bytes_total{{{key}}} {tx}')
    return lines


def redact(message):
    message = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', message)
    if SECRET.search(message):
        return '[evento ocultado por contener posibles credenciales]'
    message = re.sub(r'\?[^\s"<>]+', '?[oculto]', message)
    return EMAIL.sub('[correo oculto]', message)[:1500]


def log_entry(timestamp, source, service, stream, level, message):
    event = {'source': source, 'service': service, 'stream': stream,
             'level': level, 'message': redact(message)}
    return [str(timestamp), json.dumps(event, ensure_ascii=False)]


def docker_logs(container, start, end):
    result = command('docker', 'logs', '--timestamps', '--tail', str(MAX_LINES),
                     '--since', str(start), '--until', str(end), container['ID'])
    logs = []
    name = container['Names']
    for stream, output in [('stdout', result.stdout), ('stderr', result.stderr)]:
        for line in output.splitlines():
            stamp, sep, msg = line.partition(' ')
            if not sep:
                continue
            try:
                ns = int(dt.datetime.fromisoformat(stamp[:19] + '+00:00').timestamp()) * 10**9
                if stamp[19:20] == '.':
                    ns += int(stamp[20:].removesuffix('Z').ljust(9, '0'))
            except ValueError:
                continue
            if start * 10**9 <= ns < end * 10**9:
                match = re.search(r'\b(trace|debug|info|warn(?:ing)?|error|fatal|critical)\b', msg[:100], re.I)
                level = match[0].lower().replace('warning', 'warn') if match else 'unknown'
                logs.append(log_entry(ns, 'docker', name, stream, level, msg))
    return sorted(logs, key=lambda entry: int(entry[0]))


def journal_logs(start, end):
    journal = command('journalctl', '--no-pager', '-p', 'warning', '-o', 'json',
                      '-n', '500', '--since', f'@{start}', '--until', f'@{end}').stdout
    units = {}
    levels = ['emergency', 'alert', 'critical', 'error', 'warn']
    for line in journal.splitlines():
        entry = json.loads(line)
        us = int(entry['__REALTIME_TIMESTAMP'])
        if us >= end * 10**6:
            continue
        service = str(entry.get('_SYSTEMD_UNIT') or entry.get('SYSLOG_IDENTIFIER') or 'kernel')[:160]
        message = entry.get('MESSAGE', '')
        level = levels[int(entry.get('PRIORITY', '4'))]
        units.setdefault(service, []).append(log_entry(us * 1000, 'journal', service, 'journal', level, str(message)))
    return [{'stream': {'source': 'journal', 'service': name}, 'values': rows}
            for name, rows in units.items()]


def push(streams):
    if streams:
        body = json.dumps({'streams': streams}, ensure_ascii=False).encode()
        request = urllib.request.Request(LOKI, data=body, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=8):
            pass


def main():
    import sys
    containers, units = collect_inventory()
    if sys.argv[1:] == ['--initialize-baseline']:
        baseline = {'containers': sorted(row['Names'] for row in containers),
                    'units': sorted(name for name, state in units.items() if state == 'active')}
        with BASELINE.open('x') as file:
            json.dump(baseline, file, indent=2)
        return
    baseline = json.loads(BASELINE.read_text())
    purposes = json.loads(PURPOSES.read_text())
    lines = metrics(containers, units, baseline, purposes)
    end = int(time.time()) - 2
    cursor = ROOT / 'log-cursor'
    start = max(end - 600, min(end, int(cursor.read_text()) if cursor.exists() else end - 120))
    streams, failures = [], 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        jobs = {executor.submit(docker_logs, row, start, end): row['Names'] for row in containers}
        for job in concurrent.futures.as_completed(jobs):
            try:
                if entries := job.result():
                    streams.append({'stream': {'source': 'docker', 'service': jobs[job]}, 'values': entries})
            except (RuntimeError, subprocess.TimeoutExpired):
                failures += 1
    try:
        streams.extend(journal_logs(start, end))
        push(streams)
        write_atomic(cursor, str(end))
    except (RuntimeError, OSError, subprocess.TimeoutExpired, ValueError):
        failures += 1
    lines.append(f'alltech_log_collection_failures {failures}')
    write_atomic(ROOT / 'metrics' / 'vps.prom', '\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
