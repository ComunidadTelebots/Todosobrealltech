import React, { useEffect, useId, useState } from 'react';
import { Rows3 } from 'lucide-react';
import {
  ACCOUNT_DENSITY_MODES,
  readAccountDensity,
  saveAccountDensity,
} from '../lib/accountDensity';

/**
 * Controls display density for one account panel. `containerRef` is required
 * so the data attribute and spacing variables never affect the document root.
 */
const AccountDensityControls = ({
  userId,
  containerRef,
  className = '',
  onDensityChange,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const [density, setDensity] = useState(() => readAccountDensity(userId));

  useEffect(() => {
    setDensity(readAccountDensity(userId));
  }, [userId]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return undefined;

    const previous = {
      density: container.dataset.accountDensity,
      itemGap: container.style.getPropertyValue('--account-item-gap'),
      itemPadding: container.style.getPropertyValue('--account-item-padding'),
      controlHeight: container.style.getPropertyValue('--account-control-height'),
    };

    const compact = density === 'compact';
    container.dataset.accountDensity = density;
    container.style.setProperty('--account-item-gap', compact ? '0.5rem' : '1rem');
    container.style.setProperty('--account-item-padding', compact ? '0.625rem' : '1rem');
    container.style.setProperty('--account-control-height', compact ? '2rem' : '2.5rem');

    return () => {
      if (previous.density === undefined) delete container.dataset.accountDensity;
      else container.dataset.accountDensity = previous.density;

      const restoreProperty = (name, value) => {
        if (value) container.style.setProperty(name, value);
        else container.style.removeProperty(name);
      };
      restoreProperty('--account-item-gap', previous.itemGap);
      restoreProperty('--account-item-padding', previous.itemPadding);
      restoreProperty('--account-control-height', previous.controlHeight);
    };
  }, [containerRef, density]);

  const changeDensity = (event) => {
    const nextDensity = saveAccountDensity(userId, event.target.value);
    setDensity(nextDensity);
    onDensityChange?.(nextDensity);
  };

  return (
    <section className={`space-y-3 rounded-xl border bg-background p-4 ${className}`}>
      <div className="flex items-center gap-2 font-semibold" id={titleId}>
        <Rows3 className="h-5 w-5" aria-hidden="true" />
        Densidad del panel
      </div>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Ajusta el espacio de la vista de cuentas sin cambiar el resto de la aplicación.
      </p>
      <fieldset aria-labelledby={titleId} aria-describedby={descriptionId} className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Selecciona la densidad de la vista</legend>
        {ACCOUNT_DENSITY_MODES.map((mode) => (
          <label key={mode.value} className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/50">
            <input
              type="radio"
              name={`${titleId}-density`}
              value={mode.value}
              checked={density === mode.value}
              onChange={changeDensity}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{mode.label}</span>
              <span className="block text-xs text-muted-foreground">{mode.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        Vista {density === 'compact' ? 'compacta' : 'cómoda'} activa para esta cuenta.
      </p>
    </section>
  );
};

export default AccountDensityControls;
