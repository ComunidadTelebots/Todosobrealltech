import sys,json
sys.path.insert(0,'/root/hub-reader-20260928/core')
from hub_article_reader import read_article
for post in ['240428','240417']:
 d=read_article(post)
 print(json.dumps({'post':post,'ok':d['ok'],'title':d.get('title'),'paragraphs':len(d.get('blocks',[])),'error':d.get('error')}))
