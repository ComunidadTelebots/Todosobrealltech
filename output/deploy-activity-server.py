from pathlib import Path
import subprocess,json,os,shutil,time,hashlib
import yaml
os.umask(0o077)
base=Path('/root/activity-map-20260925');backup=base/'backup';root=Path('/root/Todosobrealltech');override=root/'docker-compose.override.yml'
for image in ['todosobrealltech-web:activity-20260925','todosobrealltech-api:activity-20260925','todosobrealltech-pocketbase:activity-20260925']:subprocess.run(['docker','image','inspect',image],stdout=subprocess.DEVNULL,check=True)
assert override.read_bytes()==(backup/'docker-compose.override.yml').read_bytes(),'Compose changed since backup'
config=yaml.safe_load(override.read_text());services=config.setdefault('services',{})
old=json.loads((backup/'containers.json').read_text());api_old=next(d for d in old if d['Name']=='/todosobrealltech-api-1');api_env=dict(v.split('=',1) for v in api_old['Config']['Env'])
for name in ['web','api','pocketbase']:services.setdefault(name,{})['image']='todosobrealltech-'+name+':activity-20260925'
env=services['api'].get('environment',{})
if isinstance(env,list):env=dict(x.split('=',1) for x in env)
cors=[x.strip() for x in api_env.get('CORS_ORIGIN','').split(',') if x.strip()]
if 'https://cintiabot.todosobreall.tech' not in cors:cors.append('https://cintiabot.todosobreall.tech')
env['CORS_ORIGIN']=','.join(cors);services['api']['environment']=env
compose=['docker','compose','-p','todosobrealltech','-f',str(root/'docker-compose.yml'),'-f',str(override)]
def save():
 temp=override.with_suffix('.activity.tmp');temp.write_text(yaml.safe_dump(config,sort_keys=False));os.chmod(temp,0o600);temp.replace(override)
def up(names):subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never']+names,check=True)
def healthy(name):
 for i in range(45):
  d=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
  if d['State'].get('Health',{}).get('Status')=='healthy':return
  if not d['State']['Running']:break
  time.sleep(2)
 raise RuntimeError(name+' did not become healthy')
try:
 save();up(['pocketbase']);healthy('todosobrealltech-pocketbase-1');print('PocketBase healthy; migration activated',flush=True)
 up(['web'])
 proxies=[]
 for name in ['todosobrealltech-web-1','traefik-traefik-1']:
  d=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
  proxies.extend(v['IPAddress'] for v in d['NetworkSettings']['Networks'].values() if v['IPAddress'])
 env['TRUSTED_PROXY_CIDRS']=','.join(proxies);save();up(['api']);healthy('todosobrealltech-api-1');print('Web and API activated; specific proxy addresses trusted',flush=True)
except Exception:
 shutil.copy2(backup/'docker-compose.override.yml',override);up(['pocketbase','api','web']);raise
moonroot=Path('/root/moonbot');files=['moon_multibot.py','core/stable_web_bridge.py','core/language_map.py','web/hub.html']
for rel in files:assert (moonroot/rel).read_bytes()==(backup/'moonbot'/rel).read_bytes(),'Moonbot changed: '+rel
try:
 for rel in files:shutil.copy2(base/'moonbot'/rel,moonroot/rel)
 subprocess.run(['docker','restart','moonbot'],check=True,stdout=subprocess.DEVNULL);healthy('moonbot');print('Moonbot healthy; origin observations and Hub consent activated',flush=True)
except Exception:
 for rel in files:shutil.copy2(backup/'moonbot'/rel,moonroot/rel)
 subprocess.run(['docker','restart','moonbot'],check=True,stdout=subprocess.DEVNULL);raise
(base/'APPLIED.txt').write_text('Activity map deployed. Private backup in backup/. Images tagged activity-20260925. Web/API/PocketBase/Moonbot healthy. Proxies limited to current web/Traefik IPs; recalculate after network changes.\n')
print('DEPLOY_OK',flush=True)
