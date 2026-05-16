/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const existing = collection.fields.getByName("last_interaction_date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("last_interaction_date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "last_interaction_date"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("bots");
  collection.fields.removeByName("last_interaction_date");
  return app.save(collection);
})