/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.indexes.push("CREATE UNIQUE INDEX idx_translations_key ON translations (key)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_translations_key"));
  return app.save(collection);
})