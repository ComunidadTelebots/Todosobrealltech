import React, { useId, useMemo, useState } from 'react';
import { CheckCircle2, Download, PlugZap, Upload, XCircle } from 'lucide-react';
import {
  previewAccountInterchangePackage,
  serializeAccountInterchangePackage,
} from '../lib/accountInterchange';

const AccountInteroperableConnector = ({
  accounts = [],
  className = '',
  onValidatedPackage,
}) => {
  const titleId = useId();
  const importId = useId();
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const exportText = useMemo(() => serializeAccountInterchangePackage(accounts), [accounts]);
  const preview = useMemo(
    () => (importText.trim() ? previewAccountInterchangePackage(importText) : null),
    [importText],
  );

  const downloadExport = () => {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts-package-v1-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Paquete exportado con ${accounts.length} cuenta${accounts.length === 1 ? '' : 's'}.`);
  };

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportText(await file.text());
      setMessage('Archivo cargado para previsualización. No se ha aplicado ningún cambio.');
    } catch {
      setMessage('No se pudo leer el archivo seleccionado.');
    }
    event.target.value = '';
  };

  const sendForReview = () => {
    if (!preview?.valid) return;
    onValidatedPackage?.(preview);
    setMessage('Paquete validado y enviado para revisión. Ningún cambio se aplicó automáticamente.');
  };

  return (
    <section className={`space-y-5 rounded-xl border bg-background p-4 ${className}`} aria-labelledby={titleId}>
      <div>
        <h3 id={titleId} className="flex items-center gap-2 font-semibold">
          <PlugZap className="h-5 w-5" aria-hidden="true" />
          Conector interoperable de cuentas
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Intercambia paquetes JSON v1. Las importaciones solo se validan y nunca se aplican automáticamente.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-3">
          <h4 className="font-medium">Exportar paquete</h4>
          <p className="text-xs text-muted-foreground">Incluye únicamente campos compatibles y excluye datos desconocidos.</p>
          <textarea readOnly value={exportText} rows={8} aria-label="Vista previa del paquete exportado" className="w-full rounded-md border bg-muted/30 p-2 font-mono text-xs" />
          <button type="button" onClick={downloadExport} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
            <Download className="mr-1 inline h-4 w-4" aria-hidden="true" />
            Descargar JSON
          </button>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <h4 className="font-medium">Previsualizar importación</h4>
          <label htmlFor={importId} className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <Upload className="mr-1 h-4 w-4" aria-hidden="true" />
            Seleccionar JSON
          </label>
          <input id={importId} type="file" accept="application/json,.json" onChange={readFile} className="sr-only" />
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            spellCheck="false"
            aria-label="Contenido JSON para validar"
            placeholder="Pega aquí un paquete de cuentas JSON v1"
            className="w-full rounded-md border bg-background p-2 font-mono text-xs"
          />

          {preview && (
            <div className={`rounded-md border p-3 text-sm ${preview.valid ? 'border-emerald-500/40' : 'border-red-500/40'}`} role="status">
              <p className="flex items-center gap-2 font-medium">
                {preview.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />}
                {preview.valid ? `${preview.accounts.length} cuentas compatibles` : 'El paquete necesita correcciones'}
              </p>
              {preview.errors.map((error) => <p key={error} className="mt-1 text-xs text-red-700">{error}</p>)}
              {preview.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-700">{warning}</p>)}
              {preview.accounts.map(({ index, mappedFields }) => (
                <p key={index} className="mt-2 text-xs text-muted-foreground">
                  Cuenta {index + 1}: {mappedFields.map(({ source, target }) => source === target ? source : `${source} → ${target}`).join(', ') || 'sin campos'}
                </p>
              ))}
            </div>
          )}

          <button type="button" disabled={!preview?.valid} onClick={sendForReview} className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            Enviar paquete validado para revisión
          </button>
        </div>
      </div>
      <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">{message}</p>
    </section>
  );
};

export default AccountInteroperableConnector;
