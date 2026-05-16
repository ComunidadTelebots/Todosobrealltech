/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const existing = collection.fields.getByName("users");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("users"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "users",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bots");
  collection.fields.removeByName("users");
  return app.save(collection);
})