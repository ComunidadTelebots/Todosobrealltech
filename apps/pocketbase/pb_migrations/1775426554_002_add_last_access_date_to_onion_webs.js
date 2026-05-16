/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");

  const existing = collection.fields.getByName("last_access_date");
  if (existing) {
    if (existing.type === "date") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("last_access_date"); // exists with wrong type, remove first
  }

  collection.fields.add(new DateField({
    name: "last_access_date"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.fields.removeByName("last_access_date");
  return app.save(collection);
})