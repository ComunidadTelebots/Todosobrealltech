const host=process.env.POCKETBASE_HOST||'http://localhost:8090';
console.log('PB host',new URL(host).hostname);
for(const fields of ['id,slug,titulo','titulo,contenido,fecha,created,fuente_label,fuente_url,categoria,autor,editor']){
 try{const r=await fetch(host+'/api/collections/nw3_noticias/records?perPage=1&filter=oculto%3Dfalse&fields='+fields,{signal:AbortSignal.timeout(10000)});const d=await r.json();console.log(r.status,d.totalItems,Object.keys(d.items?.[0]||{}),d.message||'');}catch(e){console.log(e.name,e.message)}
}
