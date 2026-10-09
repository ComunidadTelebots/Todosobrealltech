import fs from 'node:fs/promises';
import {archiveFetch} from '/app/src/utils/newsArchiveResolver.js';
const c=JSON.parse(await fs.readFile('/data/news-archive-index.json','utf8'));const m=new Map(c.rows).get('ff93c5790dd05107');
const p=new URLSearchParams({filter:`id="${m.id}" && oculto=false`,fields:'titulo,contenido,fecha,created,fuente_label,fuente_url,categoria,autor,editor',perPage:'1'});
const start=Date.now();try{const r=await archiveFetch(process.env.POCKETBASE_HOST+'/api/collections/nw3_noticias/records?'+p);const d=await r.json();console.log('result',r.status,d.items?.length,Date.now()-start);}catch(e){console.log(e.message)}
