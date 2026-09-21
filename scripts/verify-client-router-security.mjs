import fs from 'node:fs';
import path from 'node:path';

const roots = ['apps/web/src', 'apps/noticiasweb3/src', 'apps/canales/src'];
const forbidden = /unstable_RSC|react-server|RSCRouter|RSCStaticRouter|ServerRouter|decodeReply|createCallServer/;
const extensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const violations = [];

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(target);
    else if (extensions.has(path.extname(entry.name)) && forbidden.test(fs.readFileSync(target, 'utf8'))) violations.push(target);
  }
}

for (const root of roots) scan(root);
if (violations.length) {
  console.error(`Uso inseguro de API RSC detectado:\n${violations.join('\n')}`);
  process.exit(1);
}
console.log('OK: las SPA cliente no usan las API RSC inestables de React Router.');
