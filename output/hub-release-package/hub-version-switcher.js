(() => {
  'use strict';
  const current = document.currentScript?.dataset.hubVersion || 'stable-deployed';
  const prefix = '/hub-releases/';
  async function boot() {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) return;
    let auth, catalog;
    try {
      const response = await fetch('/api/public/tg_auth', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({initData:tg.initData}), cache:'no-store', signal:AbortSignal.timeout(12000)});
      if (!response.ok) return;
      auth = await response.json();
      if (!auth.ok || auth.is_master !== true) return;
      const r = await fetch(prefix+'catalog.json', {cache:'no-store', signal:AbortSignal.timeout(12000)});
      if (!r.ok) return;
      catalog = await r.json();
      if (!Array.isArray(catalog.versions)) return;
    } catch (_) { return; }
    const active = catalog.versions.find(v=>v.id===current);
    const style=document.createElement('style');
    style.textContent='#moonVersionButton{position:fixed;right:10px;top:calc(8px + env(safe-area-inset-top));z-index:10000;max-width:230px;border:1px solid #5dcaa5;border-radius:12px;padding:8px 12px;background:#10231f;color:#e5fff5;font:12px system-ui;text-align:right}#moonVersions{position:fixed;inset:0;box-sizing:border-box;width:min(94vw,620px);max-height:85vh;border:1px solid #5dcaa5;border-radius:16px;padding:20px;background:#101820;color:#fff;font:14px system-ui;z-index:10001;overflow:auto}#moonVersions::backdrop{background:#000b}#moonVersions button{padding:10px;border-radius:8px;border:1px solid #658;background:#203040;color:white;cursor:pointer}#moonVersions button:disabled{opacity:.5;cursor:not-allowed}#moonVersions article{padding:12px 0;border-bottom:1px solid #456}#moonVersions small{display:block;color:#bed0db;margin:6px 0}';
    document.head.append(style);
    const button=document.createElement('button');button.id='moonVersionButton';
    button.textContent=(active?.label||current)+' · '+(active?.version||'sin número')+' ▾';
    button.title='Versión del Hub y selector master';
    const dialog=document.createElement('dialog');dialog.id='moonVersions';
    const title=document.createElement('h2');title.textContent='Versiones del Hub';dialog.append(title);
    const info=document.createElement('p');info.textContent='Motor activo: estable '+catalog.backendVersion+'. Cambias la interfaz para esta sesión; no se actualizan los bots. Las funciones de desarrollo pueden requerir otro backend.';dialog.append(info);
    const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>dialog.close();dialog.append(close);
    for (const row of catalog.versions) {
      const article=document.createElement('article'),name=document.createElement('strong'),detail=document.createElement('small'),select=document.createElement('button');
      name.textContent=row.label+' · '+(row.version||'sin número');
      detail.textContent=(row.ref||'Estable implementada')+' · '+(row.commit||'parche local').slice(0,8)+(row.reason?' · '+row.reason:'')+(row.id===current?' · Viendo ahora':'');
      select.textContent=row.id===current?'Versión actual':row.id==='stable-deployed'?'Volver a estable':'Abrir esta interfaz';
      const allowed=row.url==='/hub.html'||(typeof row.url==='string'&&/^\/hub-releases\/[a-z0-9-]+\/hub\.html$/.test(row.url));
      select.disabled=row.id===current||row.available!==true||!allowed;
      select.onclick=()=>{if(!select.disabled)window.location.assign(row.url+window.location.hash);};
      article.append(name,detail,select);dialog.append(article);
    }
    button.onclick=()=>dialog.showModal();document.body.append(button,dialog);
  }
  boot();
})();
