import urllib.request,json
for base in ['http://todosobrealltech-api:3001/telegram-channel/TodoSobreAllTech','https://todosobreall.tech/hcgi/api/telegram-channel/TodoSobreAllTech']:
 try:
  with urllib.request.urlopen(base,timeout=12) as r:
   d=json.load(r)
   print(base, r.status, len(d.get('messages',[])))
 except Exception as e: print(base,type(e).__name__,str(e)[:100])

