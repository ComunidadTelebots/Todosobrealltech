from pathlib import Path
import json, subprocess, time, yaml

root = Path('/root/Todosobrealltech')
override = root / 'docker-compose.override.yml'
backup = Path('/root/tdlib-deploy-20260927/backup/release-selector-compose.yml')
image = 'todosobrealltech-web:release-selector-20260927'
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
    config['services']['web']['image']=image
    override.write_text(yaml.safe_dump(config,sort_keys=False))
    activate('web')
    configure_proxies()
    for _ in range(25):
        if inspect('todosobrealltech-api-1')['State'].get('Health',{}).get('Status')=='healthy': break
        time.sleep(2)
    else: raise RuntimeError('API health check failed')
    assert inspect('todosobrealltech-web-1')['State']['Running']
    print('Release selector deployed; API healthy; proxy IPs refreshed; bot containers unchanged')
except Exception:
    config=yaml.safe_load(backup.read_text())
    override.write_bytes(backup.read_bytes())
    activate('web')
    configure_proxies()
    raise
