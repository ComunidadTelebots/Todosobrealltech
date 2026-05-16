/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.indexes.push("CREATE UNIQUE INDEX idx_onion_webs_onion_address ON onion_webs (onion_address)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_onion_webs_onion_address"));
  return app.save(collection);
})