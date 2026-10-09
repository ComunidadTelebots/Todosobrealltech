"""VPS-only canary transition. Never emit credentials or Telegram payloads."""
from pathlib import Path
import contextlib, http.client, io, json, os, shutil, socket, subprocess, tarfile, time
import urllib.request, urllib.parse

B = Path('/root/tdlib-deploy-20260927')
os.umask(0o077)
state_path = B/'canary-state.json'
assert not state_path.exists(), 'Existing transition must be reconciled before repeating'

def inspect(name):
    return json.loads(subprocess.check_output(['docker','inspect',name]))[0]

def tokens(name):
    code = """import os,json,contextlib,io
from dotenv import load_dotenv
load_dotenv('/app/.env')
assert os.getenv('CIPHER_KEY')
with contextlib.redirect_stdout(io.StringIO()):
 from token_manager import token_manager
 bots=token_manager.load_bots_from_file('/app/data/bots.json',encrypted=True)
print(json.dumps([b['token'] for b in bots if b.get('enabled',True)]))
"""
    result = subprocess.run(['docker','exec','-i',name,'python','-'],input=code,capture_output=True,text=True,check=True)
    return json.loads(result.stdout)

def call(origin, token, method):
    request = urllib.request.Request(origin+'/bot'+token+'/'+method,data=b'',method='POST')
    try:
        with urllib.request.urlopen(request,timeout=60) as response:
            data = json.load(response)
    except Exception:
        raise RuntimeError('Bot API transport failed for '+method) from None
    if not data.get('ok'):
        raise RuntimeError('Bot API rejected '+method)
    return data['result']

class DockerConnection(http.client.HTTPConnection):
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(60)
        self.sock.connect('/var/run/docker.sock')

def create(body):
    connection=DockerConnection('localhost')
    connection.request('POST','/containers/create?name=moonbot-helper-test',body=json.dumps(body),headers={'Content-Type':'application/json'})
    response=connection.getresponse();data=response.read();connection.close()
    assert response.status==201, 'Docker could not create the candidate'

gateway=inspect('moonbot-telegram-gateway')
assert gateway['State'].get('Health',{}).get('Status')=='healthy'
assert not gateway['HostConfig']['PortBindings'], 'Gateway must have no public ports'
local='http://'+gateway['NetworkSettings']['Networks']['moon-telegram']['IPAddress']+':8081'
helper=inspect('moonbot-helper-test')
assert helper['Config']['Image']=='moonbot:helper-test-20260923'
selected=tokens('moonbot-helper-test')
assert len(selected)==1
token=selected[0]
assert token not in tokens('moonbot'), 'Canary token overlaps production'
profile=call('https://api.telegram.org',token,'getMe')
assert profile.get('username','').lower()=='ctbapptestbot', 'Wrong canary'
assert not call('https://api.telegram.org',token,'getWebhookInfo').get('url'), 'Webhook requires another transition'
subprocess.run(['docker','image','inspect','moonbot:helper-tdlib-20260927'],check=True,stdout=subprocess.DEVNULL)
state={'phase':'verified','bot_id':profile['id'],'at':time.time()}
def save(phase):
    state['phase']=phase;state_path.write_text(json.dumps(state));print('CANARY '+phase,flush=True)
save('verified')
subprocess.run(['docker','stop','--time','60','moonbot-helper-test'],check=True,stdout=subprocess.DEVNULL)
assert not inspect('moonbot-helper-test')['State']['Running']
with tarfile.open(B/'backup/helper-data.tar.gz','w:gz') as archive:
    archive.add('/root/moon-helper-test-20260923/data',arcname='data')
save('receiver_stopped')
assert call('https://api.telegram.org',token,'logOut') is True
save('cloud_logged_out')
verified=call(local,token,'getMe')
assert verified['id']==profile['id']
for method in ['getMyCommands','getMyDescription','getWebhookInfo']:
    call(local,token,method)
save('gateway_contracts_verified')
config=helper['Config'].copy()
config['Image']='moonbot:helper-tdlib-20260927'
env=dict(v.split('=',1) for v in config['Env'])
env.update(MOON_BOT_API_URL='http://telegram-gateway:8081',MOON_LOCAL_BOT_IDS=str(profile['id']))
config['Env']=[k+'='+v for k,v in env.items()]
config['Hostname']='moonbot-helper-test'
host=helper['HostConfig'].copy();host['NetworkMode']='moon-support-test';host['AutoRemove']=False
host['RestartPolicy']={'Name':'unless-stopped','MaximumRetryCount':0}
config['HostConfig']=host
config['NetworkingConfig']={'EndpointsConfig':{'moon-support-test':{'Aliases':['moonbot-helper-test']},'moon-telegram':{'Aliases':['moonbot-helper-test']}}}
subprocess.run(['docker','rename','moonbot-helper-test','moonbot-helper-cloud-backup-20260927'],check=True)
create(config)
subprocess.run(['docker','start','moonbot-helper-test'],check=True,stdout=subprocess.DEVNULL)
save('gateway_worker_started')
for _ in range(40):
    d=inspect('moonbot-helper-test')
    if d['State'].get('Health',{}).get('Status')=='healthy':
        save('healthy');break
    if not d['State']['Running']:raise RuntimeError('Canary exited; old receiver remains stopped')
    time.sleep(2)
else:raise RuntimeError('Canary health not confirmed; inspect before any rollback')
