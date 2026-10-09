import json, os, secrets, shutil, socket, subprocess, sys, tempfile, time, urllib.request, urllib.error, uuid, zipfile
from pathlib import Path
version=sys.argv[1]
root=Path(__file__).resolve().parent
binary=root / ('pocketbase-'+version) / 'pocketbase.exe'
if not binary.exists():
    binary.parent.mkdir(exist_ok=True)
    archive=root / ('pocketbase-'+version+'.zip')
    urllib.request.urlretrieve('https://github.com/pocketbase/pocketbase/releases/download/v'+version+'/pocketbase_'+version+'_windows_amd64.zip', archive)
    with zipfile.ZipFile(archive) as z:
        binary.write_bytes(z.read('pocketbase.exe'))
with tempfile.TemporaryDirectory(prefix='visitor-smoke-',dir=root) as tmp:
    folder=Path(tmp); migrations=folder/'migrations'; migrations.mkdir()
    shutil.copy(root/'activity-map-resume/apps/pocketbase/pb_migrations/1790100000_create_web_pageviews.js', migrations)
    args=[str(binary),'--dir',str(folder/'data'),'--migrationsDir',str(migrations)]
    password=secrets.token_urlsafe(32)
    for action in [['migrate','up'],['superuser','create','smoke@example.test',password]]:
        result=subprocess.run(args+action,capture_output=True,text=True)
        if result.returncode: raise RuntimeError('PocketBase setup failed: '+result.stderr)
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    process=subprocess.Popen(args+['serve','--http','127.0.0.1:'+str(port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    token=''
    def request(path,body=None,authorized=False):
        headers={'Content-Type':'application/json'}
        if authorized: headers['Authorization']=token
        req=urllib.request.Request('http://127.0.0.1:'+str(port)+'/api/'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=3) as response: return response.status,json.load(response)
        except urllib.error.HTTPError as e: return e.code,json.load(e)
    try:
        for i in range(50):
            try:
                if request('health')[0]==200: break
            except OSError: time.sleep(.1)
        status,auth=request('collections/_superusers/auth-with-password',{'identity':'smoke@example.test','password':password})
        assert status==200, 'authentication failed'
        token=auth['token']
        event={'event_id':str(uuid.uuid4()),'source':'web','page':'/','language':'es','country':'ES','city':'Test only','device':'desktop','mapped':True,'lat':0,'lon':0}
        status,_=request('collections/web_pageviews/records',event,True)
        assert status==200, ('create',status)
        status,_=request('collections/web_pageviews/records',event,True)
        assert status==400, ('duplicate',status)
        status,_=request('collections/web_pageviews/records',event)
        assert status==403, ('anonymous write',status)
        status,_=request('collections/web_pageviews/records')
        assert status==403, ('anonymous read',status)
        status,data=request('collections/web_pageviews/records',authorized=True)
        assert status==200 and data['totalItems']==1 and data['items'][0]['created'], ('read',status)
        print('PASS PocketBase '+version+': migration, persisted event, duplicate rejection, anonymous read/write denied, timestamp. Isolated temporary database only.')
    finally:
        process.terminate(); process.wait(timeout=10)
