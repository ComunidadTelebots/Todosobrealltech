/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const news = app.findCollectionByNameOrId('nw3_noticias');
  if (!news.fields.getByName('telegram_publish_status')) news.fields.add(new Field({
    name: 'telegram_publish_status', type: 'select', maxSelect: 1,
    values: ['not_applicable', 'pending', 'published', 'failed'],
  }));
  if (!news.fields.getByName('telegram_publish_attempts')) news.fields.add(new Field({
    name: 'telegram_publish_attempts', type: 'number', min: 0, onlyInt: true,
  }));
  if (!news.fields.getByName('telegram_publish_error')) news.fields.add(new Field({
    name: 'telegram_publish_error', type: 'text', max: 500,
  }));
  if (!news.fields.getByName('telegram_publish_updated')) news.fields.add(new Field({
    name: 'telegram_publish_updated', type: 'date',
  }));
  return app.save(news);
}, (app) => {
  const news = app.findCollectionByNameOrId('nw3_noticias');
  for (const name of ['telegram_publish_status', 'telegram_publish_attempts', 'telegram_publish_error', 'telegram_publish_updated']) {
    try { news.fields.removeByName(name); } catch {}
  }
  return app.save(news);
});
