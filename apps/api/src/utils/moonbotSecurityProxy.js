const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function sanitizeUrlInspectionRequest(raw = {}) {
  const value = typeof raw.value === 'string' ? raw.value.trim() : '';
  if (!value || value.length > 2048 || CONTROL_CHARACTERS.test(value)) {
    throw new TypeError('URL no válida');
  }
  return { url: value };
}
