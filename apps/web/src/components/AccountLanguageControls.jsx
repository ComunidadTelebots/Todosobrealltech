import React, { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import {
  ACCOUNT_LANGUAGES,
  getAccountLanguageDirection,
  readAccountLanguage,
  saveAccountLanguage,
} from '../lib/accountLanguage';

/**
 * Language preference for an account panel. It only sets `lang` and `dir` on
 * the element referenced by `containerRef`; it does not alter the document.
 */
const AccountLanguageControls = ({
  userId,
  containerRef,
  className = '',
  onLanguageChange,
}) => {
  const [language, setLanguage] = useState(() => readAccountLanguage(userId));

  useEffect(() => {
    setLanguage(readAccountLanguage(userId));
  }, [userId]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return undefined;

    const previousLanguage = container.getAttribute('lang');
    const previousDirection = container.getAttribute('dir');
    container.setAttribute('lang', language);
    container.setAttribute('dir', getAccountLanguageDirection(language));

    return () => {
      if (previousLanguage === null) container.removeAttribute('lang');
      else container.setAttribute('lang', previousLanguage);
      if (previousDirection === null) container.removeAttribute('dir');
      else container.setAttribute('dir', previousDirection);
    };
  }, [containerRef, language]);

  const selectLanguage = (event) => {
    const nextLanguage = saveAccountLanguage(userId, event.target.value);
    setLanguage(nextLanguage);
    onLanguageChange?.(nextLanguage);
  };

  return (
    <section
      className={`space-y-3 rounded-xl border bg-background p-4 ${className}`}
      aria-labelledby="account-language-title"
    >
      <h3 id="account-language-title" className="flex items-center gap-2 font-semibold">
        <Languages className="h-5 w-5" aria-hidden="true" />
        Idioma del panel
      </h3>
      <label className="block space-y-2 text-sm font-medium">
        <span>Selecciona un idioma</span>
        <select
          className="w-full rounded-md border bg-background px-3 py-2"
          value={language}
          onChange={selectLanguage}
          aria-describedby="account-language-help"
        >
          {ACCOUNT_LANGUAGES.map(({ code, label }) => (
            <option key={code} value={code} lang={code} dir={getAccountLanguageDirection(code)}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p id="account-language-help" className="text-xs text-muted-foreground">
        La preferencia se guarda para esta cuenta. El contenido disponible no se traduce automáticamente.
      </p>
    </section>
  );
};

export default AccountLanguageControls;
