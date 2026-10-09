import subprocess,pathlib,json,shutil,time,urllib.request
import yaml
root=pathlib.Path('/root/Todosobrealltech');stage=pathlib.Path('/root/noticiasweb3-facts-20260928');stage.mkdir(exist_ok=True)
compose=['docker','compose','-f',str(root/'docker-compose.yml'),'-f',str(root/'docker-compose.override.yml')]
config=json.loads(subprocess.check_output(compose+['config','--format','json']))
service=config['services']['noticiasweb3'];build=service.get('build',{});context=pathlib.Path(build.get('context',str(root)))
patch=stage/'noticiasweb3-facts.patch'
subprocess.run(['git','apply','--check',str(patch)],cwd=context,check=True)
subprocess.run(['git','apply',str(patch)],cwd=context,check=True)
image='todosobrealltech-noticiasweb3:facts-20260928'
command=['docker','build','-t',image,'-f',str(context/'apps/noticiasweb3/Dockerfile')]
for key,value in build.get('args',{}).items():
 if value is not None:command+=['--build-arg',f'{key}={value}']
command.append(str(context))
with (stage/'build.log').open('w') as log:subprocess.run(command,check=True,stdout=log,stderr=subprocess.STDOUT)
override=root/'docker-compose.override.yml';backup=stage/'override.backup.yml';shutil.copy2(override,backup)
try:
 data=yaml.safe_load(override.read_text()) or {};data.setdefault('services',{}).setdefault('noticiasweb3',{})['image']=image;override.write_text(yaml.safe_dump(data,sort_keys=False))
 subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never','noticiasweb3'],check=True)
 for _ in range(20):
  try:
   with urllib.request.urlopen('https://noticiasweb3.todosobreall.tech/',timeout=8) as r:
    if r.status==200:break
  except Exception:time.sleep(3)
 else:raise RuntimeError('Public site unavailable')
 print('NOTICIASWEB3_DEPLOYED',flush=True)
except Exception:
 shutil.copy2(backup,override);subprocess.run(compose+['up','-d','--no-deps','--no-build','--pull','never','noticiasweb3'],check=False);raise
