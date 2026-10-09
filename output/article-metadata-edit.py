from pathlib import Path
p=Path('.moonbot-reference/web/hub-channel-reader.js');s=p.read_text(encoding='utf-8')
s=s.replace('.alltech-reader .iv-source{','.alltech-reader .iv-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:16px;margin:12px 0 20px;border:1px solid var(--line,#34445c);border-radius:13px;background:var(--card,#ffffff09)}.alltech-reader .iv-details dt{font-size:11px;color:var(--muted,#98a9c2);margin-bottom:4px}.alltech-reader .iv-details dd{font-size:14px;margin:0;overflow-wrap:anywhere}.alltech-reader .iv-source{')
needle="card.append(element('div',data.publisher,'iv-meta'),element('h2',data.title));"
replacement="""card.append(element('h2',data.title));
      const details=element('dl','','iv-details'),rawDate=String(data.published_at||''),date=new Date(rawDate),validDate=rawDate&&!Number.isNaN(date.getTime()),hasTime=/T\\d{2}:\\d{2}/.test(rawDate),hasZone=/(Z|[+-]\\d{2}:?\\d{2})$/i.test(rawDate);
      const dateLabel=validDate?(hasTime&&hasZone?date.toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'}):rawDate.slice(0,10).split('-').reverse().join('/')):'No disponible';
      const timeLabel=validDate&&hasTime?(hasZone?date.toLocaleTimeString('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'})+' · Europe/Madrid':rawDate.slice(11,16)+' · zona no indicada'):'No disponible';
      [['Fecha de publicación',dateLabel],['Hora de publicación',timeLabel],['Editor',data.editor||'No indicado por el medio'],['Autor',data.author||'No indicado por el medio'],['Medio',data.publisher_name||data.publisher]].forEach(([label,value])=>{const item=element('div');item.append(element('dt',label),element('dd',value));details.append(item);});card.append(details);"""
assert needle in s;s=s.replace(needle,replacement);p.write_text(s,encoding='utf-8')
p=Path('.moonbot-reference/web/hub.html');p.write_text(p.read_text(encoding='utf-8').replace('hub-channel-reader.js?v=20260928-5','hub-channel-reader.js?v=20260928-6'),encoding='utf-8')
