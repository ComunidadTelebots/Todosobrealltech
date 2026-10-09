import pathlib,shutil,subprocess,time,urllib.request,json
root=pathlib.Path('/root/moonbot'); stage=pathlib.Path('/root/hub-reader-20260928'); backup=stage/'metadata-backup';backup.mkdir(exist_ok=True)
files=['core/hub_article_reader.py','core/hub_channel_reader.py','web/hub-channel-reader.js','web/hub.html']
for name in files:
 dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,dest)
try:
 for name in ['core/hub_article_reader.py','core/hub_channel_reader.py','web/hub-channel-reader.js']:
  shutil.copy2(stage/name,root/name)
 hub=root/'web/hub.html';hub.write_text(hub.read_text().replace('hub-channel-reader.js?v=20260928-5','hub-channel-reader.js?v=20260928-6'))
 subprocess.run(['docker','exec','moonbot','python','-m','py_compile','/app/core/hub_article_reader.py','/app/core/hub_channel_reader.py'],check=True)
 subprocess.run(['docker','restart','moonbot'],check=True,stdout=subprocess.DEVNULL)
 for attempt in range(45):
  try:
   with urllib.request.urlopen('https://cintiabot.todosobreall.tech/hub.html',timeout=5) as r:
    if r.status==200:break
  except Exception:time.sleep(3)
 else:raise RuntimeError('Hub no responde')
 print('HUB_ARTICLE_DEPLOYED',flush=True)
except Exception:
 for name in files:shutil.copy2(backup/name,root/name)
 subprocess.run(['docker','restart','moonbot'],check=False,stdout=subprocess.DEVNULL)
 raise
