/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");

  const existing = collection.fields.getByName("sv");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("sv"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "sv"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.fields.removeByName("sv");
  return app.save(collection);
})