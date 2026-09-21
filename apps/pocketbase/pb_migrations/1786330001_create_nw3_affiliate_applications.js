/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try { app.findCollectionByNameOrId('nw3_affiliate_applications'); return; } catch {}
  const staff = '@request.auth.role = "creator" || @request.auth.role = "admin"';
  const users = app.findCollectionByNameOrId('users');
  const collection = new Collection({
    name: 'nw3_affiliate_applications', type: 'base',
    listRule: staff, viewRule: staff, createRule: null, updateRule: staff, deleteRule: staff,
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'reference', type: 'text', required: true, min: 16, max: 16, pattern: '^NW3-[A-F0-9]{12}$' },
      { name: 'campaign_id', type: 'text', required: true, max: 80 },
      { name: 'title', type: 'text', required: true, min: 3, max: 80 },
      { name: 'description', type: 'text', required: true, min: 10, max: 240 },
      { name: 'url', type: 'url', required: true, exceptDomains: [] },
      { name: 'contact', type: 'text', required: true, max: 120 },
      { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['telegram', 'website', 'social', 'project'] },
      { name: 'requested_placements', type: 'json', maxSize: 1024 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'approved', 'rejected', 'needs_changes'] },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_nw3_affiliate_reference ON nw3_affiliate_applications (reference)'],
  });
  return app.save(collection);
}, (app) => { try { return app.delete(app.findCollectionByNameOrId('nw3_affiliate_applications')); } catch { return null; } });
