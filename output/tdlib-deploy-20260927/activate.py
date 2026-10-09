from pathlib import Path
import hashlib, json, shutil, subprocess, time, os, importlib.util
import yaml

os.umask(0o077)
b = Path('/root/tdlib-deploy-20260927')
moon = Path('/root/moonbot')
web = Path('/root/Todosobrealltech')
override = web/'docker-compose.override.yml'
assert override.read_bytes() == (b/'backup/Todosobrealltech-override.yml').read_bytes(), 'Compose changed'
manifest = json.loads((b/'stable-manifest.json').read_text())
for row in manifest:
    assert hashlib.sha256((moon/row['file']).read_bytes()).hexdigest() == row['original_sha256'], 'Source changed'
files = [row['file'] for row in manifest] + ['core/bot_endpoint.py','core/traffic_control.py','core/tdlib_migration.py']
for image in ['todosobrealltech-api:tdlib-20260927','todosobrealltech-web:tdlib-20260927']:
    subprocess.run(['docker','image','inspect',image],check=True,stdout=subprocess.DEVNULL)
saved = []
for rel in files:
    dest = b/'backup/moon'/rel
    dest.parent.mkdir(parents=True,exist_ok=True)
    if (moon/rel).exists():
        shutil.copy2(moon/rel,dest)
        saved.append(rel)
(b/'backup/moon-existing.json').write_text(json.dumps(saved))
compose = ['docker','compose','-p','todosobrealltech','-f',str(web/'docker-compose.yml'),'-f',str(override)]
def up(services):
    subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never']+services,check=True,stdout=subprocess.DEVNULL)
def healthy(name):
    for _ in range(40):
        r=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
        if r['State'].get('Health',{}).get('Status')=='healthy':return
        if not r['State']['Running']:break
        time.sleep(2)
    raise RuntimeError('Service failed health check: '+name)
try:
    for rel in files: shutil.copy2(b/'stable'/rel,moon/rel)
    spec=importlib.util.spec_from_file_location('audit',b/'moon/tools/audit_tdlib_compatibility.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    report=module.inventory(moon)
    (moon/'TDLIB_COMPATIBILITY.json').write_text(json.dumps(report,indent=2))
    subprocess.run(['docker','restart','moonbot'],check=True,stdout=subprocess.DEVNULL)
    healthy('moonbot')
    print('Moonbot stable healthy; routing default remains cloud',flush=True)
    config=yaml.safe_load(override.read_text())
    for service in ['api','web']:config.setdefault('services',{}).setdefault(service,{})['image']='todosobrealltech-'+service+':tdlib-20260927'
    override.write_text(yaml.safe_dump(config,sort_keys=False))
    up(['web'])
    proxies=[]
    for name in ['todosobrealltech-web-1','traefik-traefik-1']:
        d=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
        proxies.extend(v['IPAddress'] for v in d['NetworkSettings']['Networks'].values() if v['IPAddress'])
    env=config['services']['api'].get('environment',{})
    if isinstance(env,list):env=dict(x.split('=',1) for x in env)
    env['TRUSTED_PROXY_CIDRS']=','.join(proxies)
    config['services']['api']['environment']=env
    override.write_text(yaml.safe_dump(config,sort_keys=False))
    up(['api']);healthy('todosobrealltech-api-1')
    print('Web and API activated and API healthy',flush=True)
    (b/'DEPLOYED').write_text('Stable gateway routing preparation and TDLib diagnostics deployed. No bot transport changed.\n')
except Exception:
    for rel in files:
        if rel in saved:shutil.copy2(b/'backup/moon'/rel,moon/rel)
        elif (moon/rel).exists():(moon/rel).unlink()
    subprocess.run(['docker','restart','moonbot'],stdout=subprocess.DEVNULL)
    shutil.copy2(b/'backup/Todosobrealltech-override.yml',override)
    up(['web','api'])
    raise
