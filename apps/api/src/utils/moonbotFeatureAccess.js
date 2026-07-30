const ROLE_LEVEL = Object.freeze({ user: 0, group_admin: 1, group_creator: 2, master: 3 });
const RELEASE_LEVEL = Object.freeze({ stable: 0, rc: 1, beta: 2, alpha: 3 });

export const normalizeReleaseChannel = (value) => (
  Object.hasOwn(RELEASE_LEVEL, String(value || '').toLowerCase())
    ? String(value).toLowerCase()
    : 'stable'
);

export const canUseReleaseFeature = (actorChannel, feature) => (
  RELEASE_LEVEL[normalizeReleaseChannel(actorChannel)]
  >= RELEASE_LEVEL[normalizeReleaseChannel(feature?.release_channel)]
);

export const moonRoleFor = (role) => ({
  creator: 'master',
  master: 'master',
  group_creator: 'group_creator',
  admin: 'group_admin',
  moderator: 'group_admin',
  group_admin: 'group_admin',
  user: 'user',
})[String(role || 'user').toLowerCase()] || 'user';

export const canUseMoonbotFeature = (actorRole, feature) => {
  const actorLevel = ROLE_LEVEL[moonRoleFor(actorRole)] ?? ROLE_LEVEL.user;
  const requiredLevel = ROLE_LEVEL[String(feature?.minimum_role || 'master').toLowerCase()];
  return requiredLevel !== undefined && actorLevel >= requiredLevel;
};

export const filterMoonbotFeatures = (features, actorRole, releaseChannel = 'stable') => (
  Array.isArray(features)
    ? features.filter((feature) => canUseMoonbotFeature(actorRole, feature) && canUseReleaseFeature(releaseChannel, feature))
    : []
);

const GROUP_PARAMETER_NAMES = new Set(['group_id', 'chat_id', 'channel_id']);

export const featureGroupParameter = (feature) => (
  (feature?.input_schema?.parameters || []).find((parameter) => GROUP_PARAMETER_NAMES.has(parameter?.name)) || null
);

export const normalizeFeatureGroups = (groups) => {
  const seen = new Set();
  return (Array.isArray(groups) ? groups : []).flatMap((group) => {
    const id = String(group?.id ?? group?.chat_id ?? '').trim();
    if (!/^-?\d+$/.test(id) || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      name: String(group?.name || group?.title || `Grupo ${id}`).slice(0, 160),
      access_role: String(group?.access_role || group?.admin_status || 'group_admin'),
      type: String(group?.type || group?.ctype || 'group'),
    }];
  });
};

export const payloadGroupId = (feature, payload) => {
  const parameter = featureGroupParameter(feature);
  if (!parameter) return null;
  if (parameter.binding === 'args') {
    const parameters = feature.input_schema.parameters || [];
    const position = parameters.filter((item) => item.binding === 'args').indexOf(parameter);
    return String(payload?.args?.[position] ?? '').trim();
  }
  return String(payload?.kwargs?.[parameter.name] ?? '').trim();
};

export const canUseFeatureInGroup = (feature, payload, groups, actorRole) => {
  const parameter = featureGroupParameter(feature);
  if (!parameter) return true;
  const groupId = payloadGroupId(feature, payload);
  if (!groupId) return false;
  if (moonRoleFor(actorRole) === 'master') return /^-?\d+$/.test(groupId);
  return normalizeFeatureGroups(groups).some((group) => group.id === groupId);
};
