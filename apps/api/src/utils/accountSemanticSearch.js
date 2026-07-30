const normalize = (value) => String(value ?? '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9@._-]+/g, ' ').trim();

const CONCEPTS = [
  { id: 'role_admin', terms: ['admin', 'administrador', 'administradores', 'administrator'], field: 'role', match: (account) => normalize(account.role) === 'admin', weight: 8 },
  { id: 'role_creator', terms: ['creator', 'creador', 'creadores'], field: 'role', match: (account) => normalize(account.role) === 'creator', weight: 8 },
  { id: 'role_user', terms: ['user', 'usuario', 'usuarios'], field: 'role', match: (account) => normalize(account.role) === 'user', weight: 7 },
  { id: 'status_active', terms: ['activo', 'activa', 'activos', 'activas', 'active', 'operativa'], field: 'status', match: (account) => !account.is_frozen && !['inactive', 'disabled'].includes(normalize(account.status)), weight: 6 },
  { id: 'status_frozen', terms: ['congelado', 'congelada', 'congelados', 'bloqueado', 'blocked', 'frozen'], field: 'status', match: (account) => account.is_frozen === true, weight: 7 },
  { id: 'verified', terms: ['verificado', 'verificada', 'verificados', 'verified', 'confirmado'], field: 'verified', match: (account) => account.verified === true, weight: 5 },
  { id: 'unverified', terms: ['sin verificar', 'no verificado', 'no verificada', 'unverified', 'pendiente verificar'], field: 'verified', match: (account) => account.verified !== true, weight: 6 },
  { id: 'has_proxy', terms: ['con proxy', 'proxy asignado', 'usa proxy'], field: 'proxy', match: (account, context) => context.proxyOwners.has(String(account.id ?? '')), weight: 5 },
  { id: 'without_proxy', terms: ['sin proxy', 'ningun proxy', 'no proxy'], field: 'proxy', match: (account, context) => !context.proxyOwners.has(String(account.id ?? '')), weight: 5 },
];

const SEARCHABLE_FIELDS = ['name', 'username', 'email', 'role', 'language'];

const queryConcepts = (query) => {
  const normalized = normalize(query);
  return CONCEPTS.filter((concept) => concept.terms.some((term) => {
    const candidate = normalize(term);
    return candidate.includes(' ') ? normalized.includes(candidate) : normalized.split(' ').includes(candidate);
  }));
};

const proxyOwners = (proxies) => new Set((Array.isArray(proxies) ? proxies : [])
  .map((proxy) => String(proxy?.user_id ?? proxy?.account_id ?? '').trim()).filter(Boolean));

export const searchAccountsSemantically = (accounts = [], query = '', { proxies = [], limit = 20 } = {}) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery || !Array.isArray(accounts)) return [];
  const concepts = queryConcepts(normalizedQuery);
  const conceptTerms = new Set(concepts.flatMap((concept) => concept.terms.flatMap((term) => normalize(term).split(' '))));
  const freeTerms = normalizedQuery.split(' ').filter((term) => term.length >= 2 && !conceptTerms.has(term));
  const context = { proxyOwners: proxyOwners(proxies) };

  return accounts.map((account) => {
    const matchedConcepts = concepts.filter((concept) => concept.match(account, context));
    const matchedFields = [];
    let lexicalScore = 0;
    for (const field of SEARCHABLE_FIELDS) {
      const fieldValue = normalize(account?.[field]);
      const matches = freeTerms.filter((term) => fieldValue.includes(term));
      if (matches.length) {
        matchedFields.push(field);
        lexicalScore += matches.length * (field === 'role' ? 3 : 2);
      }
    }
    const score = matchedConcepts.reduce((total, concept) => total + concept.weight, 0) + lexicalScore;
    const fields = [...new Set([...matchedConcepts.map((concept) => concept.field), ...matchedFields])].sort();
    return {
      account_id: String(account?.id ?? ''),
      score,
      matched_concepts: matchedConcepts.map((concept) => concept.id),
      matched_fields: fields,
      explanation: fields.length
        ? `Coincidencia por ${matchedConcepts.length ? 'intención y ' : ''}campos: ${fields.join(', ')}.`
        : '',
    };
  }).filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.account_id.localeCompare(right.account_id))
    .slice(0, Math.max(0, Math.min(100, Number.isInteger(limit) ? limit : 20)));
};
