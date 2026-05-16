/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");

  const existing = collection.fields.getByName("ar");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("ar"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "ar"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.fields.removeByName("ar");
  return app.save(collection);
})