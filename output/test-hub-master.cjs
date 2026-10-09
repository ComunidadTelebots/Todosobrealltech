const fs = require('fs'); const vm = require('vm'); const assert = require('assert/strict');
const code=fs.readFileSync('output/hub-master-native.js','utf8');
(async()=>{
 let calls=0;
 const c=vm.createContext({master:false,hubMasterToken:'',AbortSignal,fetch:async()=>{calls++;return {ok:true,status:200,json:async()=>({ok:true,cpu:1})}}});
 vm.runInContext(code,c);
 await assert.rejects(c.hubMasterRequest('/api/status')); assert.equal(calls,0);
 c.master=true;c.hubMasterToken='test';
 let received;
 c.fetch=async(path,opts)=>{received=opts;return {ok:true,status:200,json:async()=>({ok:true})}};
 await c.hubMasterRequest('/api/status'); assert.equal(received.headers.Authorization,'Bearer test');assert.equal(received.cache,'no-store');
 c.fetch=async()=>({status:401,ok:false}); await assert.rejects(c.hubMasterRequest('/api/status'));assert.equal(c.hubMasterToken,'');
 const html=fs.readFileSync('output/hub-master-integrated.html','utf8');
 assert(!html.includes('openLink("https://cintiabot.todosobreall.tech/panel")'));
 assert(html.includes('master: loadIntegratedMaster'));
 console.log('PASS: unauthorized access blocked, bearer session, expiration, native navigation');
})().catch(e=>{console.error(e);process.exit(1)});
