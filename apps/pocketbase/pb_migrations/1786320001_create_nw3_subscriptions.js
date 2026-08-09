/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try { app.findCollectionByNameOrId('nw3_subscriptions'); return; } catch {}
  const users = app.findCollectionByNameOrId('users');
  const ownerRule = 'user = @request.auth.id || @request.auth.role = "creator" || @request.auth.role = "admin"';
  const collection = new Collection({
    name: 'nw3_subscriptions', type: 'base',
    listRule: ownerRule, viewRule: ownerRule,
    createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
    updateRule: ownerRule, deleteRule: ownerRule,
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'topics', type: 'json', required: true, maxSize: 4096 },
      { name: 'frequency', type: 'select', required: true, maxSelect: 1, values: ['instant', 'daily', 'weekly'] },
      { name: 'active', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_nw3_subscriptions_user ON nw3_subscriptions (user)'],
  });
  return app.save(collection);
}, (app) => {
  try { return app.delete(app.findCollectionByNameOrId('nw3_subscriptions')); } catch { return null; }
});
