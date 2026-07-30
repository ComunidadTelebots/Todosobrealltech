const ROLE_LEVEL = Object.freeze({ user: 0, group_admin: 1, group_creator: 2, master: 3 });

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

export const filterMoonbotFeatures = (features, actorRole) => (
  Array.isArray(features) ? features.filter((feature) => canUseMoonbotFeature(actorRole, feature)) : []
);
