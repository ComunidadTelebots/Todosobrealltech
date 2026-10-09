from pathlib import Path
import json, subprocess, time, yaml

root = Path('/root/Todosobrealltech')
override = root / 'docker-compose.override.yml'
backup = Path('/root/tdlib-deploy-20260927/backup/conversations-compose.yml')
image = 'todosobrealltech-web:conversations-20260927'
subprocess.run(['docker', 'image', 'inspect', image], check=True, stdout=subprocess.DEVNULL)
assert not backup.exists(), 'Deployment already attempted; inspect before retry'
backup.write_bytes(override.read_bytes())
backup.chmod(0o600)
config = yaml.safe_load(override.read_text())
compose = ['docker', 'compose', '-p', 'todosobrealltech', '-f', str(root/'docker-compose.yml'), '-f', str(override)]
def activate(service):
    subprocess.run(compose+['up', '-d', '--no-deps', '--no-build', '--pull', 'never', service], check=True, stdout=subprocess.DEVNULL)
def inspect(name):
    return json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]
def proxy_ips():
    return ','.join(v['IPAddress'] for name in ['todosobrealltech-web-1','traefik-traefik-1'] for v in inspect(name)['NetworkSettings']['Networks'].values() if v['IPAddress'])
def configure_proxies():
    env=config['services']['api'].get('environment', {})
    if isinstance(env,list): env=dict(x.split('=',1) for x in env)
    env['TRUSTED_PROXY_CIDRS']=proxy_ips()
    config['services']['api']['environment']=env
    override.write_text(yaml.safe_dump(config,sort_keys=False))
    activate('api')
try:
    import shutil
    base=Path('/root/tdlib-deploy-20260927')
    shutil.copy2(base/'conversations/bot_conversations.py','/root/moonbot/core/bot_conversations.py')
    shutil.copy2(base/'conversations/moon_multibot.py','/root/moonbot/moon_multibot.py')
    subprocess.run(['docker','restart','moonbot'],check=True,stdout=subprocess.DEVNULL)
    for _ in range(25):
        if inspect('moonbot')['State'].get('Health',{}).get('Status')=='healthy': break
        time.sleep(2)
    else: raise RuntimeError('Moonbot health check failed')
    config['services']['web']['image']=image
    config['services']['api']['image']='todosobrealltech-api:conversations-20260927'
    override.write_text(yaml.safe_dump(config,sort_keys=False))
    activate('web')
    configure_proxies()
    for _ in range(25):
        if inspect('todosobrealltech-api-1')['State'].get('Health',{}).get('Status')=='healthy': break
        time.sleep(2)
    else: raise RuntimeError('API health check failed')
    assert inspect('todosobrealltech-web-1')['State']['Running']
    print('Conversations deployed; Moonbot and API healthy; proxy IPs refreshed')
except Exception:
    shutil.copy2('/root/tdlib-deploy-20260927/backup/conversations/moon_multibot.py','/root/moonbot/moon_multibot.py')
    subprocess.run(['docker','restart','moonbot'],stdout=subprocess.DEVNULL)
    config=yaml.safe_load(backup.read_text())
    override.write_bytes(backup.read_bytes())
    activate('web')
    configure_proxies()
    raise
