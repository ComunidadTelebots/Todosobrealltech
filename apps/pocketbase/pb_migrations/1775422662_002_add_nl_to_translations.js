/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");

  const existing = collection.fields.getByName("nl");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("nl"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "nl"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.fields.removeByName("nl");
  return app.save(collection);
})