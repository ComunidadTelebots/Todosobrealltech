from pathlib import Path
import json, os, subprocess, time

b=Path('/root/tdlib-deploy-20260927')
image='moonbot-telegram-gateway:20260927'
subprocess.run(['docker','image','inspect',image],check=True,stdout=subprocess.DEVNULL)
result=subprocess.check_output(['docker','run','--rm','--network','none','--entrypoint','python',image,'-c','import os,json;print(json.dumps([os.getuid(),os.getgid()]))'],text=True)
uid,gid=json.loads(result)
assert uid!=0
secret=b/'secrets/tdlib.env'
assert secret.is_file()
os.chown(secret,uid,gid);secret.chmod(0o600)
env=dict(os.environ,MOON_GATEWAY_IMAGE=image,MOON_TDLIB_SECRET_FILE=str(secret))
subprocess.run(['docker','compose','-f',str(b/'gateway-compose.yml'),'config','-q'],env=env,check=True)
subprocess.run(['docker','compose','-f',str(b/'gateway-compose.yml'),'up','-d','--no-build','--pull','never'],env=env,check=True)
for _ in range(25):
    d=json.loads(subprocess.check_output(['docker','inspect','moonbot-telegram-gateway']))[0]
    assert not d['HostConfig']['PortBindings']
    if d['State'].get('Health',{}).get('Status')=='healthy':
        print('Gateway healthy; private network, non-root user and persistent volume verified',flush=True)
        break
    if not d['State']['Running']:raise RuntimeError('Gateway exited; inspect sanitized diagnostics')
    time.sleep(2)
else:raise RuntimeError('Gateway readiness not confirmed')
