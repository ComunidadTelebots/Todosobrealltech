/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  // El registro público siempre nace como usuario. Las elevaciones se realizan
  // exclusivamente desde la API autenticada del master (superusuario PB).
  collection.createRule = "@request.body.role = 'user'";
  collection.updateRule = "(@request.auth.id = id && @request.body.role:changed = false && @request.body.is_frozen:changed = false) || (@request.auth.role = 'admin' && @request.body.role:changed = false) || @request.auth.role = 'creator'";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.createRule = "";
  collection.updateRule = "@request.auth.id = id || @request.auth.role = 'admin' || @request.auth.role = 'creator'";
  return app.save(collection);
});
