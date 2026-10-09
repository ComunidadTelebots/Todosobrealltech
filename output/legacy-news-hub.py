from pathlib import Path
p=Path('.moonbot-reference/web/hub-channel-reader.js');s=p.read_text(encoding='utf-8');s=s.replace("if(!/^[1-9]\\d{0,11}$/.test(String(id)))return;", "if(!/^(?:[1-9]\\d{0,11}|news_[a-f0-9]{16})$/.test(String(id)))return;")
s=s.replace("get('/api/public/network/instant/alltech/article/'+id)","get(String(id).startsWith('news_')?'/api/public/network/instant/news/'+id.slice(5):'/api/public/network/instant/alltech/article/'+id)")
s=s.replace("status.textContent='Lectura dentro del Hub';const card", """if(data.embedded){const url=safeUrl(data.url);if(!url||url.origin!=='https://noticiasweb3.todosobreall.tech')throw new Error();const frame=element('iframe');frame.title=data.title||'Noticia de Noticiasweb3';frame.src=url.href;frame.style.cssText='width:100%;height:70dvh;border:0;border-radius:14px';list.append(frame);status.textContent='Noticia del archivo · dentro del Hub';return;}
      status.textContent='Lectura dentro del Hub';const card""")
s=s.replace("if(articleStart)showReader(articleStart[1]);", "if(/^news_[a-f0-9]{16}$/.test(start))showReader(start);else if(articleStart)showReader(articleStart[1]);")
p.write_text(s,encoding='utf-8');p=Path('.moonbot-reference/web/hub.html');p.write_text(p.read_text(encoding='utf-8').replace('20260928-7','20260928-8'),encoding='utf-8')
