const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

const asArray = (value) => (Array.isArray(value) ? value : []);
const text = (value, fallback = '') => String(value ?? fallback).trim();
const priority = (value, fallback = 'medium') => {
  const normalized = text(value).toLowerCase();
  return Object.hasOwn(PRIORITY_WEIGHT, normalized) ? normalized : fallback;
};

const accountIds = (item) => {
  const values = Array.isArray(item?.account_ids) ? item.account_ids : [item?.account_id ?? item?.user_id];
  return [...new Set(values.map((value) => text(value)).filter(Boolean))];
};

const makeStep = ({ id, source, action, priority: level, accounts, explanation, details }) => ({
  id,
  source,
  action,
  priority: level,
  account_ids: accounts,
  explanation,
  details,
  automated: false,
  requires_confirmation: true,
});

const anomalySteps = (anomalies) => asArray(anomalies).map((anomaly, index) => {
  const type = text(anomaly?.type, 'unknown');
  const accounts = accountIds(anomaly);
  return makeStep({
    id: `anomaly:${text(anomaly?.id, `${type}-${index + 1}`)}`,
    source: 'anomaly',
    action: `review_${type}`,
    priority: priority(anomaly?.severity, 'high'),
    accounts,
    explanation: text(anomaly?.explanation, `Revisa manualmente la anomalía ${type}.`),
    details: { type, anomaly_id: text(anomaly?.id) || null },
  });
});

const approvalSteps = (approvals) => asArray(approvals)
  .filter((approval) => text(approval?.status, 'pending').toLowerCase() === 'pending')
  .map((approval, index) => {
    const approvalId = text(approval?.id, `pending-${index + 1}`);
    const accounts = accountIds(approval);
    const field = text(approval?.change?.field, 'account change');
    return makeStep({
      id: `approval:${approvalId}`,
      source: 'approval',
      action: 'review_pending_approval',
      priority: 'high',
      accounts,
      explanation: `Revisa la aprobación pendiente de ${field}; ninguna modificación se aplicará automáticamente.`,
      details: { approval_id: approvalId, change: approval?.change ?? null },
    });
  });

const proxySteps = (proxies) => asArray(proxies).flatMap((proxy, index) => {
  const status = text(proxy?.status, proxy?.healthy === false ? 'unhealthy' : 'healthy').toLowerCase();
  if (['healthy', 'active', 'ok', 'online'].includes(status)) return [];
  const proxyId = text(proxy?.id, `proxy-${index + 1}`);
  const accounts = accountIds(proxy);
  const critical = ['offline', 'failed', 'unreachable', 'error'].includes(status);
  return [makeStep({
    id: `proxy:${proxyId}`,
    source: 'proxy',
    action: 'inspect_proxy_status',
    priority: critical ? 'high' : 'medium',
    accounts,
    explanation: `Comprueba manualmente el proxy ${proxyId}: su estado actual es ${status}.`,
    details: { proxy_id: proxyId, status },
  })];
});

const recommendationSteps = (recommendations) => asArray(recommendations)
  .filter((recommendation) => text(recommendation?.action, 'maintain') !== 'maintain')
  .map((recommendation, index) => {
    const action = text(recommendation?.action, 'review_account');
    const accounts = accountIds(recommendation);
    return makeStep({
      id: `recommendation:${accounts.join(',') || index + 1}:${action}`,
      source: 'recommendation',
      action,
      priority: priority(recommendation?.priority),
      accounts,
      explanation: text(recommendation?.explanation, `Valora manualmente la recomendación ${action}.`),
      details: { score: Number.isFinite(recommendation?.score) ? recommendation.score : null },
    });
  });

export const buildAccountGuidance = ({ anomalies = [], recommendations = [], approvals = [], proxies = [] } = {}) => {
  const steps = [
    ...anomalySteps(anomalies),
    ...approvalSteps(approvals),
    ...proxySteps(proxies),
    ...recommendationSteps(recommendations),
  ];

  return steps
    .map((step, order) => ({ step, order }))
    .sort((left, right) => PRIORITY_WEIGHT[right.step.priority] - PRIORITY_WEIGHT[left.step.priority]
      || left.order - right.order
      || left.step.id.localeCompare(right.step.id))
    .map(({ step }, index) => ({ ...step, order: index + 1 }));
};
