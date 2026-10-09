"""Run on the VPS. Keep private source and backups there; report counters only."""
from pathlib import Path
import ast
import json
import shutil
import hashlib
import re

BASE = Path('/root/tdlib-deploy-20260927')
ROOT = Path('/root/moonbot')
stage = BASE / 'stable'
changes = []
for rel in ['moon_multibot.py', 'core/routes_public.py']:
    path = ROOT / rel
    source = path.read_text(encoding='utf-8-sig')
    tree = ast.parse(source)
    lines = source.splitlines(keepends=True)
    edits = []
    def position(line, column):
        return sum(len(x) for x in lines[:line-1]) + len(lines[line-1].encode('utf-8')[:column].decode('utf-8'))
    for node in ast.walk(tree):
        if not isinstance(node, ast.JoinedStr):
            continue
        parts = node.values
        literals = ''.join(p.value for p in parts if isinstance(p, ast.Constant))
        values = [ast.get_source_segment(source, p.value) for p in parts if isinstance(p, ast.FormattedValue)]
        replacement = None
        if literals in ('https://api.telegram.org/bot/', 'https://api.telegram.org/bot') and len(values) == 1:
            replacement = 'bot_api_url(' + values[0] + ')' + ('.rstrip("/")' if not literals.endswith('/') else '')
        elif re.fullmatch(r'https://api\.telegram\.org/bot/[A-Za-z]+', literals) and len(values) == 1:
            replacement = 'bot_api_url(' + values[0] + ') + ' + repr(literals.rsplit('/', 1)[1])
        elif literals == 'https://api.telegram.org/file/bot/' and len(values) == 2:
            replacement = 'bot_file_url(' + ', '.join(values) + ')'
        if replacement:
            edits.append((position(node.lineno, node.col_offset), position(node.end_lineno, node.end_col_offset), replacement))
    for start, end, replacement in sorted(edits, reverse=True):
        source = source[:start] + replacement + source[end:]
    # Import after any module docstring/future imports.
    parsed = ast.parse(source)
    insertion = 0
    for n in parsed.body:
        if isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str):
            insertion = n.end_lineno
        elif isinstance(n, ast.ImportFrom) and n.module == '__future__':
            insertion = n.end_lineno
        else:
            break
    updated = source.splitlines(keepends=True)
    updated.insert(insertion, 'from core.bot_endpoint import bot_api_url, bot_file_url, uses_local_api\n')
    source = ''.join(updated)
    if rel == 'moon_multibot.py':
        # Disable a second native session only for bots explicitly routed to the gateway.
        parsed = ast.parse(source)
        guards = []
        for cls in parsed.body:
            if isinstance(cls, ast.ClassDef) and cls.name == 'MoonBot':
                for function in cls.body:
                    if isinstance(function, ast.FunctionDef) and function.name == '__init__':
                        for n in ast.walk(function):
                            if isinstance(n, ast.If):
                                identifiers = {p.id for p in ast.walk(n.test) if isinstance(p, ast.Name)}
                                if {'TDLIB_API_ID', 'TDLIB_API_HASH'} <= identifiers:
                                    guards.append(n.test)
        assert len(guards) == 1, 'Unexpected native-session guard; manual review required'
        lines = source.splitlines(keepends=True)
        n = guards[0]
        a, b = position(n.lineno, n.col_offset), position(n.end_lineno, n.end_col_offset)
        source = source[:a] + '(' + source[a:b] + ') and not uses_local_api(self.token)' + source[b:]
        assert '/api/telemetry/tdlib-migration' not in source
        anchor = next(n for n in ast.parse(source).body if isinstance(n, ast.If) and '__name__' in ast.unparse(n.test))
        lines = source.splitlines(keepends=True)
        route = "\n@app.route('/api/telemetry/tdlib-migration')\ndef tdlib_migration_status():\n    if not check_jwt(request):\n        return jsonify({'ok': False}), 401\n    from core.tdlib_migration import migration_snapshot\n    return jsonify(migration_snapshot(active_bots, bool(TDLIB_API_ID and TDLIB_API_HASH)))\n\n"
        lines.insert(anchor.lineno - 1, route)
        source = ''.join(lines)
    ast.parse(source)
    target = stage / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source, encoding='utf-8')
    changes.append({'file': rel, 'routing_replacements': len(edits), 'original_sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
for rel in ['core/bot_endpoint.py', 'core/traffic_control.py', 'core/tdlib_migration.py']:
    shutil.copy2(BASE / 'moon' / rel, stage / rel)
manifest = BASE / 'stable-manifest.json'
manifest.write_text(json.dumps(changes))
print(json.dumps({'prepared': True, 'routing_replacements': sum(r['routing_replacements'] for r in changes)}))
