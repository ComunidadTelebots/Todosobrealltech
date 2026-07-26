import React, { useState } from 'react';
import { FlaskConical, Languages, Library, Megaphone, Send, TimerReset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const Field = (props) => <input {...props} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />;
const Area = (props) => <textarea {...props} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />;

export default function MoonbotModerationProductivity() {
  const [groupId, setGroupId] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action, data) => {
    setBusy(true); setOutput('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/roadmap/action', {
        method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setOutput(JSON.stringify(payload.result, null, 2));
    } catch (error) { setOutput(`Error: ${error.message}`); } finally { setBusy(false); }
  };

  const json = (id, fallback) => { try { return JSON.parse(document.getElementById(id)?.value || fallback); } catch { throw new Error('El JSON no es válido'); } };
  const value = (id) => document.getElementById(id)?.value?.trim() || '';

  return <Card className="mt-8 border-cyan-500/20">
    <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-cyan-600" />Moderación productiva</CardTitle><CardDescription>Cinco funciones sincronizadas con el Hub de Telegram y persistidas por Moonbot.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <Field value={groupId} onChange={(event) => setGroupId(event.target.value)} placeholder="ID del grupo" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-xl border p-4"><h3 className="flex gap-2 font-semibold"><FlaskConical className="h-4 w-4" />Simulador previo</h3><Area id="webModRule" rows="3" placeholder='Regla JSON: {"keyword":"spam","action":"delete"}' /><Area id="webModSamples" rows="3" placeholder='Muestras JSON: [{"text":"spam","score":80}]' /><Button disabled={busy} onClick={() => { try { run('rule_impact', { group_id: groupId, rule: json('webModRule', '{}'), samples: json('webModSamples', '[]') }); } catch (error) { setOutput(error.message); } }}>Simular sin aplicar</Button></section>
        <section className="space-y-2 rounded-xl border p-4"><h3 className="flex gap-2 font-semibold"><Library className="h-4 w-4" />Plantilla reutilizable</h3><Field id="webTplTitle" placeholder="Nombre" /><Area id="webTplBody" rows="3" placeholder="Contenido" /><Field id="webTplTags" placeholder="Etiquetas separadas por comas" /><Button variant="outline" disabled={busy} onClick={() => run('library', { title: value('webTplTitle'), body: value('webTplBody'), tags: value('webTplTags').split(',').filter(Boolean) })}>Guardar plantilla</Button></section>
        <section className="space-y-2 rounded-xl border p-4"><h3 className="flex gap-2 font-semibold"><TimerReset className="h-4 w-4" />Informe programado</h3><select id="webReportFrequency" className="w-full rounded-lg border bg-background p-2 text-sm"><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select><select id="webReportChannel" className="w-full rounded-lg border bg-background p-2 text-sm"><option value="telegram">Telegram</option><option value="email">Email</option><option value="webhook">Webhook</option></select><Field id="webReportRecipients" placeholder="Destinatarios separados por comas" /><Button variant="outline" disabled={busy} onClick={() => run('report_schedule', { group_id: groupId, frequency: value('webReportFrequency'), channel: value('webReportChannel'), recipients: value('webReportRecipients').split(',').filter(Boolean) })}>Programar</Button></section>
        <section className="space-y-2 rounded-xl border p-4"><h3 className="flex gap-2 font-semibold"><Languages className="h-4 w-4" />Traducción coordinada</h3><Field id="webTranslateContent" placeholder="ID del contenido" /><Field id="webTranslateLanguages" placeholder="Idiomas: es,en,fr,de" /><Button variant="outline" disabled={busy} onClick={() => run('translation', { content_id: value('webTranslateContent'), languages: value('webTranslateLanguages').split(',').filter(Boolean) })}>Crear trabajo</Button></section>
      </div>
      <section className="space-y-2 rounded-xl border p-4"><h3 className="flex gap-2 font-semibold"><Megaphone className="h-4 w-4" />Comunicado versionado</h3><Field id="webAnnouncementTitle" placeholder="Título" /><Area id="webAnnouncementBody" rows="3" placeholder="Contenido" /><Button disabled={busy} onClick={() => run('public_announcement', { title: value('webAnnouncementTitle'), body: value('webAnnouncementBody') })}><Send className="mr-2 h-4 w-4" />Publicar versión</Button></section>
      {output && <pre className="max-h-80 overflow-auto rounded-xl border bg-muted/30 p-4 text-xs whitespace-pre-wrap">{output}</pre>}
    </CardContent>
  </Card>;
}
