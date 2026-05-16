/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const field = collection.fields.getByName("role");
  field.values = ["admin", "moderator", "user"];
  field.required = true;
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  const field = collection.fields.getByName("role");
  field.values = ["user", "admin"];
  field.required = false;
  return app.save(collection);
})