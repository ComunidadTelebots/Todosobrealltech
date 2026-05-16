/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blocked_users");
  collection.indexes.push("CREATE UNIQUE INDEX idx_blocked_users_user_id_source ON blocked_users (user_id, source)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blocked_users");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_blocked_users_user_id_source"));
  return app.save(collection);
})