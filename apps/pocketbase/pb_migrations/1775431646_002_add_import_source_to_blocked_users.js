/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blocked_users");

  const existing = collection.fields.getByName("import_source");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("import_source"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "import_source",
    required: false,
    values: ["cas", "csv", "json", "manual"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blocked_users");
  collection.fields.removeByName("import_source");
  return app.save(collection);
})