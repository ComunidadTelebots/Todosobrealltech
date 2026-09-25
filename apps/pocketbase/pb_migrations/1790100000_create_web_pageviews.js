migrate((app) => {
  const collection = new Collection({ name: 'web_pageviews', type: 'base',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'event_id', type: 'text', required: true, max: 36 },
      { name: 'source', type: 'select', required: true, maxSelect: 1, values: ['web', 'hub'] },
      { name: 'page', type: 'text', required: true, max: 64 },
      { name: 'language', type: 'text', required: true, max: 35 },
      { name: 'country', type: 'text', required: true, max: 3 },
      { name: 'city', type: 'text', max: 100 },
      { name: 'device', type: 'text', max: 12 },
      { name: 'mapped', type: 'bool' },
      { name: 'lat', type: 'number', min: -90, max: 90 },
      { name: 'lon', type: 'number', min: -180, max: 180 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ], indexes: ['CREATE UNIQUE INDEX idx_web_pageview_event ON web_pageviews (event_id)',
      'CREATE INDEX idx_web_pageview_created ON web_pageviews (source, created)'] });
  app.save(collection);
}, (app) => app.delete(app.findCollectionByNameOrId('web_pageviews')));
