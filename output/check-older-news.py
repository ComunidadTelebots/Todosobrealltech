import urllib.request,json
for post in ['240416','240415','240414']:
 try:
  with urllib.request.urlopen('https://cintiabot.todosobreall.tech/api/public/network/instant/alltech/article/'+post,timeout=30) as r:d=json.load(r);print(post,d.get('ok'),len(d.get('blocks',[])))
 except Exception as e:print(post,str(e))
