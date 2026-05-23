/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");

  const existing = collection.fields.getByName("destacado");
  if (existing) {
    console.log("destacado field already exists in nw3_noticias, skipping");
    return;
  }

  collection.fields.add(new BoolField({
    "hidden": false,
    "id": "nn_bool_destacado",
    "name": "destacado",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");
  collection.fields.removeByName("destacado");
  return app.save(collection);
})
