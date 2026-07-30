import crypto from 'node:crypto';

export const createRoleApproval = ({ accountId, currentRole, requestedRole, requester }) => {
  if (!/^[a-z0-9]+$/i.test(String(accountId || ''))) throw new Error('Cuenta no válida');
  if (!['admin'].includes(requestedRole) || currentRole === 'creator') throw new Error('Cambio no aprobable');
  return {
    id: crypto.randomUUID(), account_id: String(accountId), change: { field: 'role', before: currentRole, after: requestedRole },
    requested_by: requester.id, requested_by_role: requester.role, status: 'pending', created_at: new Date().toISOString(),
  };
};

export const decideRoleApproval = (approval, reviewer, decision) => {
  if (!approval || approval.status !== 'pending') throw new Error('Solicitud pendiente no encontrada');
  if (reviewer.role !== 'creator') throw new Error('Solo creator puede revisar elevaciones');
  if (approval.requested_by === reviewer.id) throw new Error('No puedes aprobar tu propia solicitud');
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Decisión no válida');
  return { ...approval, status: decision, reviewed_by: reviewer.id, reviewed_at: new Date().toISOString() };
};
