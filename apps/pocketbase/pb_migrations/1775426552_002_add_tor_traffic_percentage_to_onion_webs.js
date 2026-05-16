/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");

  const existing = collection.fields.getByName("tor_traffic_percentage");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("tor_traffic_percentage"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "tor_traffic_percentage",
    min: 0,
    max: 100
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.fields.removeByName("tor_traffic_percentage");
  return app.save(collection);
})