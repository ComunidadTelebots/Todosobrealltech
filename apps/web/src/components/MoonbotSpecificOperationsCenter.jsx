import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import MoonbotFeatureSpecificForm from '@/components/MoonbotFeatureSpecificForm.jsx';
import MoonbotAdditionalFeatureForm, { supportsAdditionalFeature } from '@/components/MoonbotAdditionalFeatureForm.jsx';

const supportsOriginalFeature = (feature) =>
  /^(optimize_|limit_|plan_|verify_|assist_|run_|review_|measure_)/.test(feature.api || '') &&
  /(_energy|_abuse|_guided_migration|_federated_compatibility|_operational_continuity|_contextually|_isolated_sandbox|_proposal_governance|_impact|_scheduled_archive|_quality)$/.test(feature.api || '');
const supported = (feature) => supportsOriginalFeature(feature) || supportsAdditionalFeature(feature.api);

export default function MoonbotSpecificOperationsCenter() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const headers = () => ({ Authorization: `Bearer ${pb.authStore.token}` });

  useEffect(() => {
    apiServerClient.fetch('/moonbot-admin/features', { headers: headers() })
      .then(async (response) => {
        const body = await apiServerClient.readJson(response);
        if (!response.ok) throw new Error(body.error);
        setItems((body.features || []).filter(supported));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const run = async () => {
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/features', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: selected.id, payload: JSON.parse(payload) }),
      });
      const body = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(body.error);
      setResult(body.result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <section className="mt-6 rounded-xl border p-4">
    <h2 className="font-semibold">Operaciones con formulario</h2>
    <p className="text-sm text-muted-foreground">Interfaces específicas sobre endpoints existentes.</p>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <button key={item.id} className="rounded-lg border p-3 text-left hover:bg-muted/40" onClick={() => { setSelected(item); setPayload(''); setResult(null); }}>
        <b>{item.title || item.capability}</b><small className="block text-muted-foreground">{item.api}</small>
      </button>)}
    </div>
    {selected && <div className="fixed inset-0 z-[90] overflow-auto bg-background/98 p-4" role="dialog" aria-modal="true" aria-label={selected.title || selected.capability || 'Operación verificada'}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="outline" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        <h2 className="text-xl font-bold">{selected.title || selected.capability}</h2>
        <MoonbotFeatureSpecificForm feature={selected} onPrepare={setPayload} />
        <MoonbotAdditionalFeatureForm feature={selected} onPrepare={setPayload} />
        {payload && <><details><summary>Revisar JSON</summary><pre className="overflow-auto rounded bg-muted p-3 text-xs">{payload}</pre></details><Button onClick={run}><Play className="mr-2 h-4 w-4" />Ejecutar de forma segura</Button></>}
        {result && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}
      </div>
    </div>}
  </section>;
}
