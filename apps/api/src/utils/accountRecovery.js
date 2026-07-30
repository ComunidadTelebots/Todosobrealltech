export const createAccountRecoveryPlan = (record, event, requestedFields) => {
  if (!event?.before || event.action === 'delete') throw new Error('Evento no recuperable');
  if (record?.role === 'creator') throw new Error('La cuenta creator está protegida');
  const requested = [...new Set(Array.isArray(requestedFields) ? requestedFields : [])];
  const available = ['role', 'is_frozen'].filter((field) => Object.hasOwn(event.before, field));
  const fields = requested.filter((field) => available.includes(field));
  if (!fields.length) throw new Error('Selecciona al menos un campo recuperable');
  const restore = {};
  if (fields.includes('role')) {
    if (!['user', 'moderator', 'admin'].includes(event.before.role)) {
      throw new Error('El rol histórico no es recuperable');
    }
    restore.role = event.before.role;
  }
  if (fields.includes('is_frozen')) restore.is_frozen = Boolean(event.before.is_frozen);
  return {
    account_id: event.account_id,
    event_id: event.id,
    fields,
    current: Object.fromEntries(fields.map((field) => [field, record[field]])),
    restore,
  };
};
