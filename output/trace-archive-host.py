from pathlib import Path
p=Path('apps/api/src/utils/newsArchiveResolver.js');s=p.read_text(encoding='utf-8').replace("new Error('Archive request timed out')","new Error('Archive request timed out: '+target.hostname+':'+target.port)");p.write_text(s,encoding='utf-8')
