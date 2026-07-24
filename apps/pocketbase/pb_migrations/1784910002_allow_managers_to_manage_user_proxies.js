/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("user_proxies");
  const manager = "@request.auth.role = 'creator' || @request.auth.role = 'admin'";
  const ownerOrManager = `user_id = @request.auth.id || ${manager}`;

  collection.listRule = ownerOrManager;
  collection.viewRule = ownerOrManager;
  collection.updateRule = ownerOrManager;
  collection.deleteRule = ownerOrManager;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("user_proxies");
  const owner = "user_id = @request.auth.id";

  collection.listRule = owner;
  collection.viewRule = owner;
  collection.updateRule = owner;
  collection.deleteRule = owner;

  return app.save(collection);
});
