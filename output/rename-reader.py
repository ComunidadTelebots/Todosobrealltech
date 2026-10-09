from pathlib import Path
p=Path('.moonbot-reference/web/hub-channel-reader.js')
s=p.read_text(encoding='utf-8')
for a,b in [('Noticias AllTech · lector del Hub','Noticiasweb3 · lector del Hub'),('AllTech · Vista instantánea','Noticiasweb3 · Vista instantánea'),('TodoSobreAllTech · Instant','Noticiasweb3 · Instant'),('Actualidad sin salir del Hub','La actualidad de Noticiasweb3 en un instante'),('Buscar publicaciones de AllTech','Buscar noticias de Noticiasweb3'),('${rows.length} publicaciones','${rows.length} noticias')]:s=s.replace(a,b)
s=s.replace('posts=data.posts||[];render();',"const all=data.posts||[];posts=all.map(p=>({...p,title:String(p.title||p.text||'').replace(/https?:\\/\\/\\S+/g,'').trim()})).filter(p=>p.title);render();const omitted=all.length-posts.length;if(omitted)status.textContent+=' · '+omitted+' publicaciones sin titular disponible';")
s=s.replace("text.replace(/https?:\\/\\/\\S+/g,'').trim().slice(0,220)||'Publicación de AllTech'",'post.title')
p.write_text(s,encoding='utf-8')
p=Path('.moonbot-reference/web/hub.html');p.write_text(p.read_text(encoding='utf-8').replace('hub-channel-reader.js?v=20260928-4','hub-channel-reader.js?v=20260928-5'),encoding='utf-8')
