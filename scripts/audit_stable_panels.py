"""Inventory committed panels without importing application code or reading secrets."""
import argparse, ast, io, json, re, subprocess, tarfile
from pathlib import Path

def git(repo, *args):
    return subprocess.check_output(['git','-C',str(repo),*args])

def scan(repo, ref, kind):
    sha=git(repo,'rev-parse',ref).decode().strip()
    result={'ref':ref,'commit':sha,'routes':[],'panels':[],'plugins':[],'parse_errors':[]}
    archive=git(repo,'archive','--format=tar',sha)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for entry in tar:
            path=entry.name
            if not entry.isfile(): continue
            if kind=='moon':
                if path.startswith('plugins/') and path.endswith('.py'):
                    result['plugins'].append(path)
                selected=path=='moon_multibot.py' or (path.startswith('core/routes_') and path.endswith('.py')) or path in ['web/hub.html','web/index.html']
            else:
                selected=path=='apps/web/src/App.jsx' or (path.startswith('apps/web/src/') and path.endswith('.jsx') and ('Moonbot' in path or '/pages/' in path))
            if not selected: continue
            source=tar.extractfile(entry).read().decode('utf-8-sig',errors='replace')
            if path.endswith('.py'):
                try: tree=ast.parse(source)
                except SyntaxError: result['parse_errors'].append(path);continue
                for node in ast.walk(tree):
                    if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
                        for d in node.decorator_list:
                            if isinstance(d,ast.Call) and isinstance(d.func,ast.Attribute) and d.func.attr in ['route','get','post','put','patch','delete'] and d.args and isinstance(d.args[0],ast.Constant) and isinstance(d.args[0].value,str):
                                result['routes'].append({'path':d.args[0].value,'handler':node.name,'file':path,'line':node.lineno})
                result.setdefault('bot_callback_prefixes',[]).extend(sorted(set(re.findall(r'callback_data["\x27]?\s*:\s*[f]?["\x27]([a-zA-Z_]+)',source))))
            elif path.endswith('.html'):
                for name in sorted(set(re.findall(r'data-view=["\x27]([^"\x27]+)',source))):result['panels'].append({'surface':'hub','name':name,'file':path})
                for name in sorted(set(re.findall(r'function\s+(renderMaster\w*|render\w+Center)\s*\(',source))):result['panels'].append({'surface':'hub','name':name,'file':path})
            else:
                result['panels'].append({'surface':'web','name':Path(path).stem,'file':path})
                for route in re.findall(r'<Route\s+[^>]*path=["\x27]([^"\x27]+)',source):result['routes'].append({'path':route,'file':path})
    result['panels']=sorted(result['panels'],key=lambda r:(r['surface'],r['name']))
    result['routes']=sorted(result['routes'],key=lambda r:r['path'])
    result['summary']={key:len(result[key]) for key in ['routes','panels','plugins','parse_errors']}
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--moon-repo',required=True);parser.add_argument('--web-repo',required=True);parser.add_argument('--output',required=True);a=parser.parse_args()
    data={'scope':'Static committed route, Hub view and web component inventory; presence is not functional certification. Dynamic registrations and runtime-loaded plugins require separate checks.','repositories':{}}
    for name,repo,refs in [('moon',a.moon_repo,['master','dev','alpha','alfa','beta','rc','prealfa']),('web',a.web_repo,['main','develop','alpha','beta','rc'])]:
        rows=[scan(repo,'origin/'+ref,name) for ref in refs]
        stable_paths={r['path'] for r in rows[0]['routes']};stable_panels={r['name'] for r in rows[0]['panels']}
        for row in rows:
            row['routes_not_in_stable']=sorted({r['path'] for r in row['routes']}-stable_paths)
            row['panels_not_in_stable']=sorted({r['name'] for r in row['panels']}-stable_panels)
        data['repositories'][name]=rows
    Path(a.output).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:[{'ref':r['ref'],**r['summary'],'new_routes':len(r['routes_not_in_stable']),'new_panels':len(r['panels_not_in_stable'])} for r in v] for k,v in data['repositories'].items()},indent=2))
if __name__=='__main__':main()
