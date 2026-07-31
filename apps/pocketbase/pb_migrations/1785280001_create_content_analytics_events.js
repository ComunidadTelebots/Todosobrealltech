/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    app.findCollectionByNameOrId('content_analytics_events');
    return;
  } catch {}

  const collection = new Collection({
    name: 'content_analytics_events',
    type: 'base',
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'target_kind', type: 'select', required: true, maxSelect: 1, values: ['news', 'community_ad'] },
      { name: 'target_id', type: 'text', required: true, max: 128, pattern: '^[A-Za-z0-9_-]+$' },
      { name: 'event_type', type: 'select', required: true, maxSelect: 1, values: ['view', 'impression', 'click'] },
      { name: 'country', type: 'text', required: true, max: 3, pattern: '^[A-Z]{2,3}$' },
      { name: 'placement', type: 'text', required: false, max: 32, pattern: '^[A-Za-z0-9_-]*$' },
      { name: 'count', type: 'number', required: true, min: 1, onlyInt: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_content_analytics_target_created ON content_analytics_events (target_kind, target_id, created)',
      'CREATE INDEX idx_content_analytics_event_country ON content_analytics_events (event_type, country)',
    ],
  });
  app.save(collection);
  const news = app.findCollectionByNameOrId('nw3_noticias');
  if (!news.fields.getByName('telegram_views')) news.fields.add(new Field({ name: 'telegram_views', type: 'number', min: 0, onlyInt: true }));
  if (!news.fields.getByName('telegram_views_synced')) news.fields.add(new Field({ name: 'telegram_views_synced', type: 'bool' }));
  if (!news.fields.getByName('community_ad_id')) news.fields.add(new Field({ name: 'community_ad_id', type: 'text', max: 128 }));
  return app.save(news);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('content_analytics_events')); } catch {}
  try {
    const news = app.findCollectionByNameOrId('nw3_noticias');
    news.fields.removeByName('telegram_views');
    news.fields.removeByName('telegram_views_synced');
    news.fields.removeByName('community_ad_id');
    return app.save(news);
  } catch { return null; }
});
