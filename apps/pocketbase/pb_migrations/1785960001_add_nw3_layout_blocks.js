/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('nw3_noticias');
  if (!collection.fields.getByName('layout_blocks')) collection.fields.add(new TextField({
    name: 'layout_blocks', required: false, max: 200000,
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('nw3_noticias');
  collection.fields.removeByName('layout_blocks');
  return app.save(collection);
});
