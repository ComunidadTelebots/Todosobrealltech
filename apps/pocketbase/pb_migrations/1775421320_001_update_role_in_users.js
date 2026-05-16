/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const field = collection.fields.getByName("role");
  field.values = ["creator", "admin", "moderator", "user"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  const field = collection.fields.getByName("role");
  field.values = ["admin", "moderator", "user"];
  return app.save(collection);
})