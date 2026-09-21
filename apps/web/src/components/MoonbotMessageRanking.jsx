import React, { useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';

const labels = { all: 'Todos', text: 'Texto', photo: 'Fotos', video: 'Vídeos', animation: 'Animaciones', video_note: 'Videomensajes', voice: 'Notas de voz', audio: 'Audios', document: 'Documentos', sticker: 'Stickers', poll: 'Encuestas', contact: 'Contactos', location: 'Ubicaciones', venue: 'Lugares', dice: 'Dados', other: 'Otros y servicio' };
export default function MoonbotMessageRanking({ client = apiServerClient }) {
  const [days, setDays] = useState('7'); const [kind, setKind] = useState('all');
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setData(null);
    (async () => {
      try {
        const response = await client.fetch(`/moonbot-admin/message-ranking?days=${days}&kind=${kind}`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
        const payload = await client.readJson(response);
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo consultar el ranking');
        if (active) setData(payload);
      } catch (reason) { if (active) setError(reason.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [client, days, kind, refresh]);
  return <section className="my-6 space-y-4 rounded-xl border p-5" aria-label="Ranking de mensajes por chat">
    <h2 className="text-xl font-semibold">Ranking de mensajes por chat</h2>
    <p className="text-sm text-muted-foreground">Grupos y canales del despliegue conectado · mensajes recibidos, antes de moderación. Cada mensaje cuenta una vez, aunque tenga pie de foto. No incluye conversaciones privadas, ediciones ni envíos del bot.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Periodo<select className="ml-2 rounded border bg-background p-2" value={days} onChange={e => setDays(e.target.value)}><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select></label>
      <label className="text-sm">Tipo<select className="ml-2 rounded border bg-background p-2" value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <Button variant="outline" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Actualizar ranking</Button>
    </div>
    {loading && <p role="status">Consultando mensajes…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {data && <><p className="text-sm"><b>{data.total.toLocaleString('es-ES')}</b> mensajes del tipo seleccionado en <b>{data.chats}</b> chats · Se muestran los primeros 100.</p>
      <p className="text-xs text-muted-foreground">Primer mensaje retenido: {data.observed_since ? new Date(data.observed_since * 1000).toLocaleString('es-ES') : 'Sin registros'} · Retención: 30 días. El periodo puede estar incompleto si el contador acaba de activarse o hubo errores de recogida. No reconstruye el historial anterior ni suma otros Docker.</p>
      {!data.rows.length ? <p>No hay mensajes registrados para este filtro.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Chats ordenados por mensajes del tipo seleccionado</caption><thead><tr>{['Puesto', 'Chat', 'Mensajes', '% del tipo seleccionado', 'Desglose de todos los tipos'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.rows.map((row, index) => <tr key={row.id} className="border-t"><td className="p-3 font-bold">{index + 1}</td><td className="p-3"><b>{row.name}</b><div className="text-xs text-muted-foreground">{row.id}</div></td><td className="p-3 tabular-nums">{row.score.toLocaleString('es-ES')}</td><td className="p-3">{(data.total ? row.score / data.total * 100 : 0).toFixed(1)}%<div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-cyan-500" style={{ width: `${data.total ? row.score / data.total * 100 : 0}%` }} /></div></td><td className="p-3"><details><summary className="cursor-pointer">{row.total.toLocaleString('es-ES')} en total</summary><ul>{Object.entries(row.types).map(([type, count]) => <li key={type}>{labels[type] || type}: {count.toLocaleString('es-ES')}</li>)}</ul></details></td></tr>)}</tbody></table></div>}</>}
  </section>;
}
