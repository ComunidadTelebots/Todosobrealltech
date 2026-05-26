/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");

  if (collection.fields.getByName("imagen")) {
    console.log("imagen field already exists in nw3_noticias, skipping");
    return;
  }

  // URL remota de la imagen del artículo (se guarda tal cual del feed, sin
  // descargar el fichero). preview.js ya la resuelve vía resolveImageUrl().
  collection.fields.add(new URLField({
    "hidden": false,
    "id": "nn_url_imagen",
    "name": "imagen",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "exceptDomains": [],
    "onlyDomains": []
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");
  collection.fields.removeByName("imagen");
  return app.save(collection);
})
