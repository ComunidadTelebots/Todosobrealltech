import subprocess
p=subprocess.Popen(['timeout','18','tcpdump','-n','-i','br-42a5d95b7803','tcp port 3001 and host 172.27.0.13','-c','10'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
code="import urllib.request\ntry:\n print(urllib.request.urlopen('http://todosobrealltech-api:3001/health',timeout=6).status)\nexcept Exception as e: print(type(e).__name__)"
r=subprocess.run(['docker','exec','-i','moonbot','python','-'],input=code,text=True,capture_output=True)
print(r.stdout);print(p.communicate()[0])
