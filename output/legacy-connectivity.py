import urllib.request,socket
for host in ['todosobrealltech-api','todosobrealltech-api-1','api']:
 try:
  print(host,socket.gethostbyname(host))
  with urllib.request.urlopen('http://'+host+':3001/noticias/rss/resolve/b03febc8bc2c2373',timeout=12) as r:print('status',r.status)
 except Exception as e:print(type(e).__name__,str(e)[:150])
