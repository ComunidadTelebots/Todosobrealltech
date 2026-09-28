import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsResolver, instantNewsId } from '../src/utils/newsArchiveResolver.js';
test('resolves older records beyond page one and rechecks public visibility', async () => {
 let hidden=false, calls=0;
 const resolve=createNewsResolver({pbHost:'http://pb',siteUrl:'https://noticiasweb3.todosobreall.tech',staticArticles:[],fetchImpl:async url=>{
  calls++;const p=new URL(url).searchParams;
  return {ok:true,json:async()=>p.has('page')?{totalPages:2,items:p.get('page')==='1'?[{id:'first',slug:'recent'}]:[{id:'old',slug:'old-news'}]}:{items:hidden?[]:[{titulo:'Old news',contenido:'Article text',fecha:'2025-01-01'}]}};
 }});
 const id=instantNewsId('https://noticiasweb3.todosobreall.tech/noticias/old-news');
 assert.equal((await resolve(id)).title,'Old news');assert.equal(calls,3);
 hidden=true;assert.equal(await resolve(id),null);assert.equal(calls,4);
 assert.equal(await resolve('../private'),null);
});
