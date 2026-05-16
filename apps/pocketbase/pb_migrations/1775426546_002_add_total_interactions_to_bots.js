/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const existing = collection.fields.getByName("total_interactions");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("total_interactions"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "total_interactions"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bots");
  collection.fields.removeByName("total_interactions");
  return app.save(collection);
})