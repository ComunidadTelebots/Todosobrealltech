import dns from 'node:dns/promises';
import {archiveFetch} from '/app/src/utils/newsArchiveResolver.js';
console.log('lookup',await dns.lookup(new URL(process.env.POCKETBASE_HOST).hostname,{all:true}));
const r=await archiveFetch(process.env.POCKETBASE_HOST+'/api/health');console.log('native',r.status);
