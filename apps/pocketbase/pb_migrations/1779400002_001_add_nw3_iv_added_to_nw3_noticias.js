/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");

  if (collection.fields.getByName("nw3_iv_added")) {
    console.log("nw3_iv_added field already exists in nw3_noticias, skipping");
    return;
  }

  // Marca los posts del canal cuyo mensaje ya se reescribió al formato Instant View
  // (enlace t.me/iv). El backfill filtra por este flag para no reprocesar en cada arranque.
  collection.fields.add(new BoolField({
    "hidden": false,
    "id": "nn_bool_iv_added",
    "name": "nw3_iv_added",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");
  collection.fields.removeByName("nw3_iv_added");
  return app.save(collection);
})
