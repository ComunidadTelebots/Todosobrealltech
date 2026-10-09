import subprocess
from pathlib import Path
for repo,files in [('.', ['apps/api/src/utils/newsArchiveResolver.js','apps/api/src/routes/noticias-rss.js']),('.moonbot-reference',['core/hub_channel_reader.py'])]:
 for f in files:Path(repo,f).write_bytes(subprocess.check_output(['git','-C',repo,'show','HEAD:'+f]))
p=Path('output/fix-news-roundtrip.py');s=p.read_text(encoding='utf-8').replace('.read_text()',".read_text(encoding='utf-8')").replace('p.write_text(s)',"p.write_text(s,encoding='utf-8')").replace("p.write_text(p.read_text(encoding='utf-8').replace('20260928-8','20260928-9'))","p.write_text(p.read_text(encoding='utf-8').replace('20260928-8','20260928-9'),encoding='utf-8')");p.write_text(s,encoding='utf-8')
