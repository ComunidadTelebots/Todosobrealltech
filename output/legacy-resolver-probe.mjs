import { createNewsResolver } from '/app/src/utils/newsArchiveResolver.js';
const r=createNewsResolver({pbHost:process.env.POCKETBASE_HOST,siteUrl:process.env.SITE_URL||'https://noticiasweb3.todosobreall.tech',staticArticles:[],fetchImpl:async(...a)=>{try{const r=await fetch(...a);if(!r.ok)console.log('status',r.status);return r;}catch(e){console.log('fetch',new URL(a[0]).searchParams.get('page'),e.name);throw e;}}});
try{const d=await r('b03febc8bc2c2373');console.log('resolved',d?.ok,d?.title);}catch(e){console.log(e.stack)}
