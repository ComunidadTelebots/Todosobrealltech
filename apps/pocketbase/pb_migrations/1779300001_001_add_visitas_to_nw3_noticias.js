/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('nw3_noticias');
  const field = new Field({ type: 'number', name: 'visitas', min: 0, required: false });
  collection.fields.push(field);
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('nw3_noticias');
  collection.fields = collection.fields.filter(f => f.name !== 'visitas');
  app.save(collection);
});
