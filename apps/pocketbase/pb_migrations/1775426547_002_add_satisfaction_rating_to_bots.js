/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const existing = collection.fields.getByName("satisfaction_rating");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("satisfaction_rating"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "satisfaction_rating",
    min: 0,
    max: 5
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bots");
  collection.fields.removeByName("satisfaction_rating");
  return app.save(collection);
})