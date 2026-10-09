import urllib.request,urllib.parse,os
print({k:urllib.parse.urlsplit(v).hostname for k,v in urllib.request.getproxies().items()})
