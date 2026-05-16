/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");

  const existing = collection.fields.getByName("ko");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("ko"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "ko"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("translations");
  collection.fields.removeByName("ko");
  return app.save(collection);
})