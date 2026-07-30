import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

const initialValue = (parameter) => {
  if (parameter.default !== null && parameter.default !== undefined) {
    return parameter.control === 'json' ? JSON.stringify(parameter.default, null, 2) : parameter.default;
  }
  if (parameter.control === 'boolean') return false;
  if (parameter.control === 'number') return '';
  if (parameter.control === 'json') return parameter.variadic && parameter.binding === 'args' || /items|events|records|rules|steps/.test(parameter.name) ? '[]' : '{}';
  return '';
};

const buildPayload = (parameters, values) => {
  const args = [];
  const kwargs = {};
  parameters.forEach((parameter, index) => {
    let value = values[index];
    if (parameter.required && (value === '' || value === null || value === undefined)) {
      throw new Error(`${parameter.label || parameter.name} es obligatorio`);
    }
    if (parameter.control === 'number' && value !== '') {
      value = Number(value);
      if (!Number.isFinite(value)) throw new Error(`${parameter.label || parameter.name} debe ser un número`);
    }
    if (parameter.control === 'json') value = JSON.parse(value || (parameter.variadic ? '[]' : '{}'));
    if (!parameter.required && value === '') return;
    if (parameter.variadic && parameter.binding === 'args' && Array.isArray(value)) args.push(...value);
    else if (parameter.variadic && parameter.binding === 'kwargs' && value && typeof value === 'object' && !Array.isArray(value)) Object.assign(kwargs, value);
    else if (parameter.binding === 'args') args.push(value);
    else kwargs[parameter.name] = value;
  });
  return { args, kwargs };
};

export default function MoonbotSchemaFeatureForm({ feature, onPayload, onValidityChange }) {
  const parameters = useMemo(() => feature?.input_schema?.parameters || [], [feature]);
  const [values, setValues] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { setValues(parameters.map(initialValue)); }, [parameters]);
  useEffect(() => {
    try {
      const payload = buildPayload(parameters, values);
      setError('');
      onPayload(JSON.stringify(payload, null, 2));
      onValidityChange?.(true);
    } catch (reason) {
      setError(`JSON no válido: ${reason.message}`);
      onValidityChange?.(false);
    }
  }, [parameters, values, onPayload, onValidityChange]);

  if (!parameters.length) return <p className="text-sm text-muted-foreground">Esta función no necesita parámetros.</p>;
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      {parameters.map((parameter, index) => <label key={`${parameter.name}-${index}`} className="text-xs font-medium">
        {parameter.label}{parameter.required ? ' *' : ''}
        {parameter.control === 'boolean'
          ? <input type="checkbox" className="ml-3 h-4 w-4 align-middle" checked={Boolean(values[index])} onChange={(event) => setValues((old) => old.map((value, position) => position === index ? event.target.checked : value))} />
          : parameter.control === 'json'
            ? <textarea className="mt-1 min-h-28 w-full rounded-md border bg-background p-2 font-mono text-xs" value={values[index] ?? ''} onChange={(event) => setValues((old) => old.map((value, position) => position === index ? event.target.value : value))} />
            : <Input className="mt-1" type={parameter.control === 'number' ? 'number' : 'text'} value={values[index] ?? ''} onChange={(event) => setValues((old) => old.map((value, position) => position === index ? event.target.value : value))} />}
        <span className="mt-1 block font-normal text-muted-foreground">{parameter.name}{parameter.annotation ? ` · ${parameter.annotation}` : ''}</span>
      </label>)}
    </div>
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>;
}
