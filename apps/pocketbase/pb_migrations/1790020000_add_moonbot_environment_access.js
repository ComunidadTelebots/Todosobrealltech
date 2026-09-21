/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: 'base', name: 'moonbot_environment_access',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'scope', type: 'text', required: true },
      { name: 'mode', type: 'select', required: true, maxSelect: 1, values: ['custom', 'inherit'] },
      { name: 'targets', type: 'json', maxSize: 4096 },
      { name: 'revision', type: 'number', required: true, onlyInt: true, min: 1 },
      { name: 'assigned_by', type: 'text', required: true },
      { name: 'history', type: 'json', maxSize: 262144 },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_moon_environment_scope ON moonbot_environment_access (scope)'],
  });
  app.save(collection);
}, (app) => app.delete(app.findCollectionByNameOrId('moonbot_environment_access')));
