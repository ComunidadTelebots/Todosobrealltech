import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, ClipboardCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const AccountOnboardingPanel = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const response = await apiServerClient.fetch('/moonbot-admin/account-tools/onboarding');
    const payload = await apiServerClient.readJson(response);
    if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el recorrido');
    setData(payload);
  }, []);
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, [load]);
  const complete = async (stepId) => {
    setBusy(stepId);
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/account-tools/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step_id: stepId }) });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || 'No se pudo completar el paso');
      setData(payload); toast.success('Paso completado');
    } catch (error) { toast.error(error.message); } finally { setBusy(''); }
  };
  if (!data) return <section className="rounded-2xl border bg-background p-6 shadow-sm"><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando incorporacion" /></section>;
  const { onboarding, creator_diagnostic: diagnostic } = data;
  return <section className="rounded-2xl border bg-background p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Recorrido de incorporación</h2><p className="text-sm text-muted-foreground">Pasos adaptados a tu rol y al estado real de tu cuenta.</p></div></div>
    <div className="mb-4"><div className="mb-1 flex justify-between text-sm"><span>{onboarding.completed} de {onboarding.total} pasos</span><b>{onboarding.percentage}%</b></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${onboarding.percentage}%` }} /></div></div>
    <div className="grid gap-2 md:grid-cols-2">{onboarding.steps.map((step) => <div key={step.id} className="flex gap-3 rounded-xl border p-4">{step.complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><b className="text-sm">{step.title}</b><p className="text-xs text-muted-foreground">{step.description}</p>{!step.complete && <div className="mt-2 flex gap-2"><button type="button" onClick={() => navigate(step.path)} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Abrir</button>{step.optional && <button type="button" disabled={busy === step.id} onClick={() => complete(step.id)} className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50">Marcar revisado</button>}</div>}</div></div>)}</div>
    {diagnostic && <div className="mt-5 rounded-xl border p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Diagnóstico de cuenta creadora</h3><p className="text-xs text-muted-foreground">Comprobación informativa; no modifica la cuenta.</p></div><b className={diagnostic.healthy ? 'text-emerald-600' : 'text-amber-600'}>{diagnostic.score}%</b></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{diagnostic.checks.map((check) => <div key={check.id} className="flex items-center gap-2 text-sm">{check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-amber-600" />}{check.label}</div>)}</div></div>}
  </section>;
};
export default AccountOnboardingPanel;
