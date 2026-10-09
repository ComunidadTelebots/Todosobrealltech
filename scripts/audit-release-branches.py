"""Read Git trees without checking out or executing code from audited branches."""
import argparse
import ast
import collections
import datetime
import json
import re
import subprocess
from pathlib import Path


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], encoding='utf-8', errors='replace').strip()


def audit(repo, base):
    rows = []
    refs = git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin').splitlines()
    for ref in refs:
        if ref == 'origin':
            continue
        files = git(repo, 'ls-tree', '-r', '--name-only', ref).splitlines()
        counts = git(repo, 'rev-list', '--left-right', '--count', f'{base}...{ref}').split()
        manifests = [name for name in files if name.endswith('_manifest.py') and
                     ('/' not in name or name.startswith('core/'))]
        features, errors, manifest_inventory = [], [], []
        for filename in manifests:
            source = git(repo, 'show', f'{ref}:{filename}').lstrip('\ufeff')
            manifest_inventory.append({'file': filename,
                'declared_channels': sorted(set(re.findall(r'[\"\'](?:release_channel)[\"\']\s*[:=]\s*[\"\']([^\"\']+)', source))),
                'referenced_tests': sorted(set(re.findall(r'tests/[A-Za-z0-9_./]+\.py', source))),
                'evaluation': 'literal'})
            try:
                tree = ast.parse(source)
                assignment = next(n for n in tree.body if isinstance(n, ast.Assign) and
                                  any(isinstance(t, ast.Name) and t.id == 'MANIFEST' for t in n.targets))
                for feature in ast.literal_eval(assignment.value):
                    if isinstance(feature, dict):
                        test = str(feature.get('test', '')).split('::')[0]
                        features.append({'id': feature.get('id'), 'title': feature.get('title'),
                                         'channel': feature.get('release_channel', 'unspecified'),
                                         'module': feature.get('module'), 'test': feature.get('test'),
                                         'test_file_present': test in files})
            except (SyntaxError, ValueError, StopIteration, TypeError) as error:
                manifest_inventory[-1]['evaluation'] = 'dynamic_not_executed'
                errors.append({'file': filename, 'error': type(error).__name__})
        rows.append({'branch': ref.removeprefix('origin/'), 'sha': git(repo, 'rev-parse', ref),
                     'base_only': int(counts[0]), 'branch_only': int(counts[1]),
                     'files': len(files), 'test_files': sum('/test' in f or f.startswith('tests/') for f in files),
                     'feature_channels': dict(collections.Counter(f['channel'] for f in features)),
                     'literal_features': features, 'unevaluated_manifests': errors,
                     'manifests': manifest_inventory,
                     'unique_commits': git(repo, 'log', '--format=%h %s', f'{base}..{ref}').splitlines()})
    local = []
    for ref in git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').splitlines():
        counts = git(repo, 'rev-list', '--left-right', '--count', f'{base}...{ref}').split()
        local.append({'branch': ref, 'sha': git(repo, 'rev-parse', ref),
                      'base_only': int(counts[0]), 'branch_only': int(counts[1])})
    return {'base': base, 'branches': rows, 'local_branches': local}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--moonbot', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    result = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': 'Remote trees and local branch divergence; declared features and test presence are not proof of runtime maturity.',
              'web': audit(root, 'origin/develop'), 'moonbot': audit(args.moonbot, 'origin/alpha')}
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for repo in ('web', 'moonbot'):
        for row in result[repo]['branches']:
            print(repo, row['branch'], row['sha'][:8], f"divergence={row['base_only']}/{row['branch_only']}",
                  f"tests={row['test_files']}", row['feature_channels'], f"dynamic_manifests={len(row['unevaluated_manifests'])}")
