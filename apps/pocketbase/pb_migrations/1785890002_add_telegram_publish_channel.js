/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const news = app.findCollectionByNameOrId('nw3_noticias');
  if (!news.fields.getByName('telegram_publish_channel')) {
    news.fields.add(new Field({ name: 'telegram_publish_channel', type: 'text', max: 64 }));
    return app.save(news);
  }
  return null;
}, (app) => {
  const news = app.findCollectionByNameOrId('nw3_noticias');
  if (news.fields.getByName('telegram_publish_channel')) {
    news.fields.removeByName('telegram_publish_channel');
    return app.save(news);
  }
  return null;
});
