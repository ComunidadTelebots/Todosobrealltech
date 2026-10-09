import sys,time
sys.path.insert(0,'/root/hub-reader-20260928/core')
from hub_article_reader import *
html,url=fetch_page('https://t.me/TodoSobreAllTech/240428?embed=1&mode=tme',time.monotonic()+22)
p=ArticleParser();p.feed(html);print('Links:',p.links)
if p.links:
 try:
  html,url=fetch_page(p.links[0],time.monotonic()+22);print('Source:',url);p=ArticleParser();p.feed(html);print('Blocks',len(p.blocks),'article blocks',sum(1 for x in p.blocks if x[2]),'jsonld',len(p.jsonld));print(extract_article(html).keys())
 except Exception as e:print(type(e).__name__,str(e))
