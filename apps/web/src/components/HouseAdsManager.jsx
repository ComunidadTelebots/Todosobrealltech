import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const empty = { title: '', description: '', url: '', image: '', placement: 'all', priority: 50, enabled: true };
export default function HouseAdsManager() {
  const [ads, setAds] = useState([]), [draft, setDraft] = useState(empty), [error, setError] = useState('');
  const request = async (body) => { const response = await apiServerClient.fetch('/house-ads', { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAds(data.ads || []); };
  useEffect(() => { apiServerClient.fetch('/house-ads').then((r) => r.json()).then((d) => setAds(d.ads || [])).catch(() => setError('No se pudo cargar el catálogo')); }, []);
  const save = async () => { try { setError(''); await request({ action: 'upsert', ad: draft }); setDraft(empty); } catch (e) { setError(e.message); } };
  return <section className="mt-8 rounded-xl border p-4"><div className="mb-4"><h3 className="font-semibold">Anuncios propios de la red</h3><p className="text-sm text-muted-foreground">Sustituyen el hueco únicamente cuando AdSense no entrega anuncio.</p></div>
    {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-2 md:grid-cols-2"><Input placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/><Input placeholder="Enlace https://t.me/..." value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })}/><Input placeholder="Descripción" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/><Input placeholder="Imagen opcional https://..." value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })}/><select className="h-10 rounded-md border bg-background px-3" value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value })}><option value="all">Todos los huecos</option><option value="top">Superior</option><option value="right">Lateral</option><option value="inline">Entre noticias</option></select><Input type="number" min="0" max="100" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}/></div>
    <Button className="mt-3" disabled={!draft.title || !draft.url} onClick={save}><Plus className="mr-2 h-4 w-4"/>Añadir anuncio propio</Button>
    <div className="mt-4 grid gap-2 md:grid-cols-2">{ads.map((ad) => <div key={ad.id} className="rounded-lg border p-3 text-sm"><b>{ad.title}</b><p className="text-muted-foreground">{ad.placement} · prioridad {ad.priority} · {ad.clicks || 0} clics</p><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => request({ action: 'upsert', ad: { ...ad, enabled: !ad.enabled } })}>{ad.enabled ? 'Pausar' : 'Activar'}</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'delete', id: ad.id })}><Trash2 className="h-4 w-4"/></Button></div></div>)}</div>
  </section>;
}
