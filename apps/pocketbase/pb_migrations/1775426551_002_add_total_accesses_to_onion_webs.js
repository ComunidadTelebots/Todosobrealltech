/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");

  const existing = collection.fields.getByName("total_accesses");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("total_accesses"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "total_accesses"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.fields.removeByName("total_accesses");
  return app.save(collection);
})