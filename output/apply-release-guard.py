
import pathlib,subprocess,json,base64,shutil,os
root=pathlib.Path('/root/moonbot'); backup=pathlib.Path('/root/moon-restart-fix-20260925-131000')
dest=root/'deployment/release-guard';dest.mkdir(parents=True,exist_ok=True)
for name,data in [('release_startup.py','IiIiRmFpbCBjbG9zZWQgYmVmb3JlIHN0YXJ0aW5nIGEgbWFudWFsbHkgYXBwcm92ZWQgcmVsZWFzZSBjb250YWluZXIuCgpJbnN0YWxsIG91dHNpZGUgL2FwcCBzbyBhbiBhY2NpZGVudGFsIHNvdXJjZSBiaW5kIGNhbm5vdCBoaWRlIHRoaXMgY2hlY2suClRoZSBjaGVjayBuZXZlciByZWFkcyBvciBsb2dzIGJvdCB0b2tlbnMuCiIiIgppbXBvcnQgb3MKZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCmltcG9ydCBzdWJwcm9jZXNzCmltcG9ydCBzeXMKCgpkZWYgdmFsaWRhdGUocm9vdCwgZW5hYmxlZCk6CiAgICByb290ID0gUGF0aChyb290KQogICAgaWYgZW5hYmxlZCAhPSAidHJ1ZSI6CiAgICAgICAgcmV0dXJuICJSZWxlYXNlIHF1YXJhbnRpbmVkOiB2YWxpZGF0ZSBpc29sYXRlZCBib3QgYXNzaWdubWVudHMgYmVmb3JlIGVuYWJsaW5nLiIKICAgIGZvciBuYW1lIGluICgic3RhcnQuc2giLCAibW9vbl9tdWx0aWJvdC5weSIsICJjb3JlL2NvbmZpZy5weSIpOgogICAgICAgIHRhcmdldCA9IHJvb3QgLyBuYW1lCiAgICAgICAgaWYgbm90IHRhcmdldC5pc19maWxlKCkgb3Igbm90IG9zLmFjY2Vzcyh0YXJnZXQsIG9zLlJfT0spOgogICAgICAgICAgICByZXR1cm4gZiJSZWxlYXNlIHN0YXJ0dXAgYmxvY2tlZDogbWlzc2luZyBvciB1bnJlYWRhYmxlIHtuYW1lfTsgY2hlY2sgL2FwcCBtb3VudHMuIgogICAgcmVzdWx0ID0gc3VicHJvY2Vzcy5ydW4oWyJiYXNoIiwgIi1uIiwgc3RyKHJvb3QgLyAic3RhcnQuc2giKV0sIGNhcHR1cmVfb3V0cHV0PVRydWUpCiAgICBpZiByZXN1bHQucmV0dXJuY29kZToKICAgICAgICByZXR1cm4gIlJlbGVhc2Ugc3RhcnR1cCBibG9ja2VkOiBzdGFydC5zaCBoYXMgaW52YWxpZCBzaGVsbCBzeW50YXguIgogICAgcmV0dXJuIE5vbmUKCgpkZWYgbWFpbigpOgogICAgcm9vdCA9IFBhdGgoIi9hcHAiKQogICAgZXJyb3IgPSB2YWxpZGF0ZShyb290LCBvcy5lbnZpcm9uLmdldCgiTU9PTl9SRUxFQVNFX0VOQUJMRUQiLCAiZmFsc2UiKSkKICAgIGlmIGVycm9yOgogICAgICAgIHByaW50KGVycm9yLCBmaWxlPXN5cy5zdGRlcnIsIGZsdXNoPVRydWUpCiAgICAgICAgcmV0dXJuIDc4CiAgICBvcy5jaGRpcihyb290KQogICAgb3MuZXhlY3ZwKCJiYXNoIiwgWyJiYXNoIiwgc3RyKHJvb3QgLyAic3RhcnQuc2giKV0pCgoKaWYgX19uYW1lX18gPT0gIl9fbWFpbl9fIjoKICAgIHN5cy5leGl0KG1haW4oKSkK'),('release_autoscaler_guard.py','IiIiUmV0aXJlIHRoZSBsZWdhY3kgQ1BVLW9ubHkgYXV0b3NjYWxlciB1bnRpbCB0b2tlbiBvd25lcnNoaXAgaXMgY29vcmRpbmF0ZWQuCgpTdGFydGluZyByZXBsaWNhcyBmcm9tIGlkZW50aWNhbCBib3QgY29uZmlndXJhdGlvbiBjYW4gZHVwbGljYXRlIFRlbGVncmFtCnJlY2VpdmVycy4gVGhpcyBjb21wYXRpYmlsaXR5IGVudHJ5cG9pbnQgaW50ZW50aW9uYWxseSBwZXJmb3JtcyBubyBEb2NrZXIgY2FsbHMuCiIiIgoKCmRlZiBtYWluKCk6CiAgICBwcmludCgiTGVnYWN5IHJlbGVhc2UgYXV0b3NjYWxlciBxdWFyYW50aW5lZDogdXNlIGV4cGxpY2l0IHdvcmtlciBhc3NpZ25tZW50czsgYXV0b21hdGljIHJlY3JlYXRpb24gZGlzYWJsZWQuIiwgZmx1c2g9VHJ1ZSkKICAgIHJldHVybiAwCgoKaWYgX19uYW1lX18gPT0gIl9fbWFpbl9fIjoKICAgIHJhaXNlIFN5c3RlbUV4aXQobWFpbigpKQo=')]:
 p=dest/name;p.write_bytes(base64.b64decode(data));p.chmod(0o644)
# Preserve the legacy program locally before replacing its stopped-container entrypoint.
subprocess.run(['docker','cp','moonbot_autoscaler:/app/autoscaler.py',str(backup/'autoscaler-original.py')],check=True,capture_output=True)
(backup/'autoscaler-original.py').chmod(0o600)
subprocess.run(['docker','cp',str(dest/'release_autoscaler_guard.py'),'moonbot_autoscaler:/app/autoscaler.py'],check=True,capture_output=True)
services={};networks={}
for channel in ['alfa','prealfa','rc','beta']:
 name='moonbot-moonbot-'+channel+'-1'
 c=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
 if channel=='beta':
  p=backup/(name+'.json');p.write_text(json.dumps(c));p.chmod(0o600)
 env=dict(item.split('=',1) for item in c['Config']['Env'] if '=' in item)
 env.update(MOON_RELEASE_ENABLED='false',AUTO_DOCKER_UPDATE='false')
 vols=[{'type':'bind','source':m['Source'],'target':m['Destination'],'read_only':not m['RW']} for m in c['Mounts'] if m['Destination']!='/app']
 vols.append({'type':'bind','source':str(dest/'release_startup.py'),'target':'/opt/moon/release_startup.py','read_only':True})
 nets=list(c['NetworkSettings']['Networks'])
 for n in nets: networks[n]={'external':True,'name':n}
 services['moonbot-'+channel]={'image':c['Image'],'profiles':['release-manual'],'restart':'on-failure:5','working_dir':'/app','command':['python','/opt/moon/release_startup.py'],'environment':env,'volumes':vols,'networks':nets,'labels':{k:v for k,v in c['Config']['Labels'].items() if not k.startswith('com.docker.compose.')}}
c=json.loads(subprocess.check_output(['docker','inspect','moonbot_autoscaler']))[0]
services['autoscaler']={'image':c['Image'],'container_name':'moonbot_autoscaler','profiles':['release-manual'],'restart':'no','command':['python','/opt/moon/release_autoscaler_guard.py'],'volumes':[{'type':'bind','source':str(dest/'release_autoscaler_guard.py'),'target':'/opt/moon/release_autoscaler_guard.py','read_only':True}],'network_mode':'none'}
p=root/'docker-compose.release.yml'
assert not p.exists(), 'Refuse to overwrite an unexpected release configuration'
p.write_text(json.dumps({'services':services,'networks':networks},indent=2));p.chmod(0o600)
compose=['docker','compose','-f',str(root/'docker-compose.yml'),'-f',str(p)]
r=subprocess.run(compose+['config','--quiet'],capture_output=True)
assert r.returncode==0,'Compose validation failed; no containers recreated'
# Prepare corrected containers without starting Telegram, any plugins or the autoscaler.
r=subprocess.run(compose+['create','--no-build','--pull','never','--force-recreate','moonbot-alfa','moonbot-prealfa','moonbot-rc'],capture_output=True)
assert r.returncode==0,'Container preparation failed; inspect private deployment logs'
print('COMPOSE_VALIDATED_AND_CONTAINERS_PREPARED')
for n in ['moonbot-moonbot-alfa-1','moonbot-moonbot-prealfa-1','moonbot-moonbot-rc-1','moonbot_autoscaler','moonbot','moonbot-helper-test']:
 c=json.loads(subprocess.check_output(['docker','inspect',n]))[0]
 print(json.dumps({'name':n,'state':c['State']['Status'],'health':c['State'].get('Health',{}).get('Status'),'restart':c['HostConfig']['RestartPolicy'],'appBind':any(m['Destination']=='/app' for m in c['Mounts'])}))
