/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("service_status");
  collection.indexes.push("CREATE UNIQUE INDEX idx_service_status_service_name ON service_status (service_name)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("service_status");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_service_status_service_name"));
  return app.save(collection);
})