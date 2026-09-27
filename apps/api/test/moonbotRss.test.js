import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRssRouter } from '../src/routes/moonbot-rss.js';

async function harness(t, user) {
  const calls=[];
  const app=express(); app.use(express.json());
  app.use(createRssRouter({ authorize: async()=>user ? {user} : {status:401,error:'unauthorized'}, upstream:async(path, options)=>{calls.push({path,options});return new Response(JSON.stringify({ok:true,feeds:[]}));} }));
  const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  return {calls,request:(path,options)=>fetch(`http://127.0.0.1:${server.address().port}${path}`,options)};
}
test('RSS requires authentication',async(t)=>{const h=await harness(t);assert.equal((await h.request('/me')).status,401);assert.equal(h.calls.length,0);});
test('master ranking rejects ordinary admins and users',async(t)=>{for(const role of ['user','admin']){const h=await harness(t,{role,telegram_id:'123'});assert.equal((await h.request('/activity')).status,403);assert.equal(h.calls.length,0);}});
test('master can read activity',async(t)=>{const h=await harness(t,{role:'creator'});assert.equal((await h.request('/activity')).status,200);assert.equal(h.calls[0].path,'/api/internal/rss/activity');});
test('personal RSS derives destination from account and drops injected fields',async(t)=>{const h=await harness(t,{role:'user',telegram_id:'123'});const response=await h.request('/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',url:'https://example.com/rss',chat_id:'999',telegram_id:'999',template:'injected'})});assert.equal(response.status,200);assert.equal(h.calls[0].path,'/api/internal/rss/users/123');assert.deepEqual(JSON.parse(h.calls[0].options.body),{action:'add',url:'https://example.com/rss'});});
test('missing Telegram identity and unsupported actions fail closed',async(t)=>{const h=await harness(t,{role:'user'});assert.equal((await h.request('/me')).status,409);const k=await harness(t,{role:'user',telegram_id:'123'});assert.equal((await k.request('/me',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"run_now"}'})).status,400);assert.equal(k.calls.length,0);});

test('catalog can be browsed before linking Telegram',async(t)=>{const h=await harness(t,{role:'user'});assert.equal((await h.request('/catalog')).status,200);assert.equal(h.calls[0].path,'/api/internal/rss/catalog');});
test('channel destination keeps authenticated actor and drops spoofed actor',async(t)=>{const h=await harness(t,{role:'user',telegram_id:'123'});assert.equal((await h.request('/channels/-99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle',feed_id:'one',enabled:true,user_id:'999'})})).status,200);assert.equal(h.calls[0].path,'/api/internal/rss/channels/123/-99');assert.deepEqual(JSON.parse(h.calls[0].options.body),{action:'toggle',feed_id:'one',enabled:true});});

test('reader derives actor and drops client publication text',async(t)=>{const h=await harness(t,{role:'user',telegram_id:'123'});const response=await h.request('/reader',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',source_id:'news',entry_id:'one',channel_id:'-99',user_id:'999',text:'injected',url:'https://evil.example'})});assert.equal(response.status,200);assert.equal(h.calls[0].path,'/api/internal/rss/reader/123');assert.deepEqual(JSON.parse(h.calls[0].options.body),{action:'share',source_id:'news',entry_id:'one',channel_id:'-99'});assert.equal(h.calls[0].options.attempts,1);});
test('unlinked account may read but cannot publish',async(t)=>{const h=await harness(t,{role:'user'});const post=(action)=>h.request('/reader',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,source_id:'news'})});assert.equal((await post('read')).status,200);assert.equal(h.calls[0].path,'/api/internal/rss/reader/0');assert.equal((await post('share')).status,409);assert.equal(h.calls.length,1);});
test('reader rejects malformed source and unknown operation',async(t)=>{const h=await harness(t,{role:'user',telegram_id:'123'});for(const body of [{action:'execute'},{source_id:{url:'https://evil.example'}}]){assert.equal((await h.request('/reader',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,400);}assert.equal(h.calls.length,0);});
