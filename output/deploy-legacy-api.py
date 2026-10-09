import pathlib,subprocess,json,yaml,shutil,time,urllib.request
root=pathlib.Path('/root/Todosobrealltech');stage=pathlib.Path('/root/news-legacy-20260928');compose=['docker','compose','-f',str(root/'docker-compose.yml'),'-f',str(root/'docker-compose.override.yml')]
old=json.loads(subprocess.check_output(['docker','inspect','todosobrealltech-api-1']))[0]['Config']['Image']
(stage/'Dockerfile').write_text('FROM '+old+'\nCOPY noticias-rss.js /app/src/routes/noticias-rss.js\nCOPY newsArchiveResolver.js /app/src/utils/newsArchiveResolver.js\n')
subprocess.run(['docker','build','-t','todosobrealltech-api:news-legacy-20260928',str(stage)],check=True,stdout=subprocess.DEVNULL)
override=root/'docker-compose.override.yml';backup=stage/'override.backup.yml';shutil.copy2(override,backup)
try:
 data=yaml.safe_load(override.read_text());data.setdefault('services',{}).setdefault('api',{})['image']='todosobrealltech-api:news-legacy-20260928';override.write_text(yaml.safe_dump(data,sort_keys=False))
 subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never','api'],check=True)
 for _ in range(25):
  try:
   with urllib.request.urlopen('https://todosobreall.tech/hcgi/api/noticias/rss/resolve/b03febc8bc2c2373',timeout=25) as r:d=json.load(r)
   if d.get('ok'):print('LEGACY_NEWS_RESOLVED',d.get('title'),len(d.get('blocks',[])),flush=True);break
  except Exception:time.sleep(3)
 else:raise RuntimeError('Exact legacy link could not be resolved')
except Exception:
 shutil.copy2(backup,override);subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never','api'],check=False);raise
