from pathlib import Path
p=Path('apps/api/src/utils/newsArchiveResolver.js');s=p.read_text(encoding='utf-8');start=s.index('// Isolate internal');end=s.index('export const instantNewsId');s=s[:start]+'''// Use Docker DNS without libuv getaddrinfo, which can be exhausted by proxy checks.
export function archiveFetch(url, options = {}) {
  return moonbotHttp(url, { signal: options.signal || AbortSignal.timeout(15000) });
}
'''+s[end:];s=s.replace("import http from 'node:http';\nimport https from 'node:https';\nimport fs from 'node:fs/promises';", "import fs from 'node:fs';\nimport { moonbotHttp } from './moonbotHttp.js';");s=s.replace("if(cacheFile) await fs.writeFile(cacheFile, JSON.stringify({updated,rows:[...index]})).catch(()=>{});", "if(cacheFile) { try { fs.writeFileSync(cacheFile, JSON.stringify({updated,rows:[...index]})); } catch {} }");s=s.replace("await fs.readFile(cacheFile,'utf8')", "fs.readFileSync(cacheFile,'utf8')");p.write_text(s,encoding='utf-8')
