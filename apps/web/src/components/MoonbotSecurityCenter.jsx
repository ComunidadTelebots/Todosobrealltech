import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  KeyRound,
  Link2,
  Network,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const call = async (path, options = {}) => {
  const response = await apiServerClient.fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${pb.authStore.token}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const IMAGE_CATEGORY_MAP = [
  { key: 'terrorism', label: 'Terrorismo y propaganda violenta' },
  { key: 'childSexual', label: 'Pornografía y abuso sexual infantil' },
  { key: 'violence', label: 'Violencia extrema / gore gráfico' },
  { key: 'weapons', label: 'Armas y entrenamiento de daño físico' },
  { key: 'selfHarm', label: 'Autolesión y contenido autolesivo' },
  { key: 'drugs', label: 'Drogas y sustancias peligrosas' },
  { key: 'hateSpeech', label: 'Discurso de odio y contenido discriminatorio' },
  { key: 'sexualContent', label: 'Contenido sexual explícito de adultos' },
  { key: 'nudity', label: 'Nudidad y desnudez no explícita' },
  { key: 'malware', label: 'Malware visual, phishing y fraude técnico' },
  { key: 'fraud', label: 'Fraude, estafas y phishing visual' },
  { key: 'spam', label: 'Spam visual y contenido repetitivo sospechoso' },
  { key: 'illicitContent', label: 'Contenido ilegal no especificado' },
  { key: 'copyright', label: 'Infracción de derechos de autor y marca' },
  { key: 'deepfake', label: 'Deepfakes y manipulación avanzada de imagen' },
];

const safePolicy = (payload = {}) => {
  const source = payload.image_policy || {};
  const videoSource = payload.video_policy || payload.media_policy || {};
  const mediaKinds = Array.isArray(videoSource.media_kinds) ? videoSource.media_kinds : [];
  const categories = source.categories || {};

  return {
    enabled: Boolean(source.enabled),
    action: ['ban', 'mute', 'review', 'warn'].includes(source.action) ? source.action : 'review',
    minConfidence: Number.isFinite(Number(source.min_confidence))
      ? Number(source.min_confidence)
      : Number.isFinite(Number(source.minConfidence))
        ? Number(source.minConfidence)
        : 75,
    autoDelete: Boolean(source.auto_delete || source.autoDelete),
    scanVideos: Boolean(source.scan_videos ?? videoSource.scan_videos ?? mediaKinds.includes('video')),
    categories: IMAGE_CATEGORY_MAP.reduce((acc, item) => {
      acc[item.key] = Boolean(categories[item.key]);
      return acc;
    }, {}),
    provider: ['vt', 'safe_search', 'local', 'ensemble'].includes(source.provider)
      ? source.provider
      : source.engine || 'ensemble',
  };
};

const MoonbotSecurityCenter = () => {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState('url');
  const [value, setValue] = useState('');
  const [secretText, setSecretText] = useState('');
  const [incidentGroups, setIncidentGroups] = useState('');
  const [incidentWindow, setIncidentWindow] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState({
    enabled: true,
    action: 'review',
    minConfidence: 75,
    scanVideos: true,
    autoDelete: false,
    categories: IMAGE_CATEGORY_MAP.reduce((acc, item) => {
      acc[item.key] = item.key === 'terrorism' || item.key === 'childSexual';
      return acc;
    }, {}),
    provider: 'ensemble',
  });

  const policyHint = useMemo(() => {
    if (!policy.enabled) return 'Filtro de imágenes desactivado.';
    const targets = [];
    IMAGE_CATEGORY_MAP.forEach((item) => {
      if (policy.categories[item.key]) targets.push(item.label.toLowerCase());
    });
    if (!targets.length) return 'Filtro activo sin categorías habilitadas.';
    const scope = policy.scanVideos ? 'imágenes y vídeos' : 'imágenes';
    return `Detecta ${targets.join(' y ')} (${scope}) con umbral ${policy.minConfidence}% y acción ${policy.action}.`;
  }, [policy]);

  const load = async () => {
    try {
      const loaded = await call('/moonbot-admin/security');
      setData(loaded);
      if (loaded.image_policy || loaded.video_policy || loaded.media_policy) {
        setPolicy(safePolicy(loaded));
      }
    } catch (cause) {
      setError(cause.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (action, payload) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const updated = await call('/moonbot-admin/security', {
        method: 'POST',
        body: JSON.stringify({ action, ...payload }),
      });
      setResult(updated);
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const evidence = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await call('/moonbot-admin/security/evidence');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `moonbot-evidence-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const correlate = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const payload = await call('/moonbot-admin/roadmap/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'incident_correlation',
          data: {
            group_ids: incidentGroups.split(',').map((item) => item.trim()).filter(Boolean),
            window_minutes: Number(incidentWindow),
            minimum_events: 2,
          },
        }),
      });
      setResult(payload);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const saveImagePolicy = async () => {
    await run('set_image_policy', {
      media_policy: {
        enabled: policy.enabled,
        scan_videos: policy.scanVideos,
        action: policy.action,
        provider: policy.provider,
        min_confidence: policy.minConfidence,
        auto_delete: policy.autoDelete,
        categories: policy.categories,
        media_kinds: ['photo', ...(policy.scanVideos ? ['video'] : [])],
      },
      image_policy: {
        ...policy,
        min_confidence: policy.minConfidence,
        auto_delete: policy.autoDelete,
        scan_videos: policy.scanVideos,
      },
    });
  };

  return (
    <Card className="mt-8 border-amber-500/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            Centro de seguridad Moonbot
          </CardTitle>
          <CardDescription>CAS, registro comunitario, amenazas, raids, VirusTotal y evidencias desde un único panel.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border p-3">
                <b className="text-2xl">{data.threats_total}</b>
                <p className="text-xs text-muted-foreground">Análisis</p>
              </div>
              <div className="rounded-xl border p-3">
                <b className="text-2xl text-red-600">{data.threats_high}</b>
                <p className="text-xs text-muted-foreground">Amenazas</p>
              </div>
              <div className="rounded-xl border p-3">
                <b className="text-2xl">{data.media_events}</b>
                <p className="text-xs text-muted-foreground">Eventos multimedia</p>
              </div>
              <div className="rounded-xl border p-3">
                <b className="text-2xl">{data.active_raids?.length || 0}</b>
                <p className="text-xs text-muted-foreground">Raids activos</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.ban_sources || {}).map(([source, count]) => (
                <Badge key={source} variant="outline">
                  {source}: {count}
                </Badge>
              ))}
            </div>
          </>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4" />
              Análisis con VirusTotal
            </h3>
            <div className="flex gap-2">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="url">URL</option>
                <option value="domain">Dominio</option>
                <option value="hash">Hash</option>
              </select>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="URL, dominio o hash" />
            </div>
            <Button className="mt-3" disabled={busy || !value.trim()} onClick={() => run('analyze', { kind, value })}>
              Analizar
            </Button>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" />
              Detector privado de secretos
            </h3>
            <Input value={secretText} onChange={(e) => setSecretText(e.target.value)} placeholder="Pega texto para comprobarlo; no se almacena" />
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy || !secretText}
              onClick={() => run('secret_scan', { text: secretText })}
            >
              Comprobar
            </Button>
          </section>
        </div>

        <section className="rounded-xl border p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Filtro de multimedia por comportamientos
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">{policyHint}</p>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={policy.enabled} onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })} />
              Habilitar filtro de imágenes y vídeos en grupos
            </label>
            <label className="grid gap-2">
              Tipo de contenido:
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={policy.scanVideos ? 'imagesAndVideos' : 'images'}
                onChange={(e) => setPolicy({ ...policy, scanVideos: e.target.value === 'imagesAndVideos' })}
              >
                <option value="images">Solo imágenes</option>
                <option value="imagesAndVideos">Imágenes y vídeos</option>
              </select>
            </label>
            <label className="grid gap-2">
              Acción ante detección:
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={policy.action}
                onChange={(e) => setPolicy({ ...policy, action: e.target.value })}
              >
                <option value="review">Solo revisión humana</option>
                <option value="warn">Aviso al administrador</option>
                <option value="mute">Mutear usuario</option>
                <option value="ban">Ban temporal</option>
              </select>
            </label>
            <label className="grid gap-2">
              Proveedor:
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={policy.provider}
                onChange={(e) => setPolicy({ ...policy, provider: e.target.value })}
              >
                <option value="ensemble">Combinado (VT + safe-search)</option>
                <option value="vt">Solo VirusTotal</option>
                <option value="safe_search">Solo safe-search</option>
                <option value="local">Solo motor interno del bot</option>
              </select>
            </label>
            <label className="grid gap-2">
              Confianza mínima para bloquear:
              <strong>{policy.minConfidence}%</strong>
              <input
                type="range"
                min={50}
                max={99}
                value={policy.minConfidence}
                onChange={(e) => setPolicy({ ...policy, minConfidence: Number(e.target.value) })}
                className="accent-amber-500"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policy.autoDelete}
                onChange={(e) => setPolicy({ ...policy, autoDelete: e.target.checked })}
              />
              Borrado automático en hallazgos críticos (además de la acción elegida)
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {IMAGE_CATEGORY_MAP.map((item) => (
                <label key={item.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(policy.categories[item.key])}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        categories: { ...policy.categories, [item.key]: e.target.checked },
                      })
                    }
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <Button className="mt-2" onClick={saveImagePolicy} disabled={busy}>
              Guardar política de imágenes y vídeos
            </Button>
          </div>
        </section>

        <section className="rounded-xl border p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Network className="h-4 w-4" />
            Correlación de incidencias
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Agrupa cronologías relacionadas por proximidad temporal, tipo y términos compartidos.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <Input
              value={incidentGroups}
              onChange={(e) => setIncidentGroups(e.target.value)}
              placeholder="IDs de grupos separados por comas"
            />
            <Input
              type="number"
              min="1"
              max="1440"
              value={incidentWindow}
              onChange={(e) => setIncidentWindow(e.target.value)}
              aria-label="Ventana en minutos"
            />
          </div>
          <Button className="mt-3" variant="outline" disabled={busy || !incidentGroups.trim()} onClick={correlate}>
            Buscar patrones comunes
          </Button>
        </section>

        {result && (
          <div
            className={`rounded-xl border p-4 ${
              result.safe === false || result.risk === 'high'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <p className="font-semibold">Resultado</p>
            {result.result?.clusters ? (
              <>
                <p className="text-sm">
                  {result.result.events_analyzed} eventos · {result.result.clusters.length} patrones
                </p>
                {result.result.clusters.map((cluster) => (
                  <div key={cluster.id} className="mt-2 rounded-lg border p-2 text-sm">
                    <Badge variant={cluster.risk === 'high' || cluster.risk === 'critical' ? 'destructive' : 'outline'}>
                      {cluster.risk}
                    </Badge>{' '}
                    {cluster.events} eventos en {cluster.groups.length} grupos
                    <p className="text-xs text-muted-foreground">
                      {cluster.shared_terms.join(', ') || 'Mismo tipo y ventana temporal'}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-sm">{result.note || result.message || `Riesgo: ${result.risk || 'sin amenazas'}`}</p>
                {result.findings?.map((finding) => (
                  <Badge className="mr-2 mt-2" key={finding.type} variant="destructive">
                    {finding.type}: {finding.count}
                  </Badge>
                ))}
              </>
            )}
          </div>
        )}

        <section className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Radar className="h-4 w-4" />
              Incidentes recientes
            </h3>
            <Button size="sm" variant="outline" disabled={busy} onClick={evidence}>
              <Download className="mr-2 h-4 w-4" />
              Exportar evidencia firmada
            </Button>
          </div>
          <div className="space-y-2">
            {data?.history?.slice(0, 12).map((item, index) => (
              <div
                key={`${item.time}-${index}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  {item.risk === 'high' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  )}
                  {item.kind || item.source}
                </span>
                <span>
                  <Badge variant="outline">{item.risk || 'analizado'}</Badge>
                </span>
              </div>
            ))}
            {!data?.history?.length && <p className="text-sm text-muted-foreground">No hay incidentes registrados.</p>}
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

export default MoonbotSecurityCenter;
