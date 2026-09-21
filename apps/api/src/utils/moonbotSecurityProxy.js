const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code <= 31 || code === 127;
});

export function sanitizeUrlInspectionRequest(raw = {}) {
  const value = typeof raw.value === 'string' ? raw.value.trim() : '';
  if (!value || value.length > 2048 || hasControlCharacters(value)) {
    throw new TypeError('URL no válida');
  }
  return { url: value };
}
