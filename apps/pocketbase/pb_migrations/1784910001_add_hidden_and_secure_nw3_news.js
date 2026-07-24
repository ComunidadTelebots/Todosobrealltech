/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");

  if (!collection.fields.getByName("oculto")) {
    collection.fields.add(new BoolField({
      "hidden": false,
      "id": "nn_bool_oculto",
      "name": "oculto",
      "presentable": false,
      "required": false,
      "system": false
    }));
  }

  const managers = "@request.auth.role = 'creator' || @request.auth.role = 'admin'";
  collection.createRule = managers;
  collection.updateRule = managers;
  collection.deleteRule = managers;
  collection.listRule = `oculto = false || ${managers}`;
  collection.viewRule = `oculto = false || ${managers}`;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("nw3_noticias");
  collection.fields.removeByName("oculto");
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";
  collection.listRule = "";
  collection.viewRule = "";
  return app.save(collection);
});
