/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");

  const existing = collection.fields.getByName("redirect_url");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("redirect_url"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "redirect_url",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("onion_webs");
  collection.fields.removeByName("redirect_url");
  return app.save(collection);
})