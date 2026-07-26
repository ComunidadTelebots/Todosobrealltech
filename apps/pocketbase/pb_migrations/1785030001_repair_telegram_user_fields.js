/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const fields = [
    "telegram_id",
    "telegram_username",
    "telegram_name",
    "telegram_photo_url",
  ];

  for (const name of fields) {
    const existing = collection.fields.getByName(name);
    if (existing && existing.type === "text") continue;
    if (existing) collection.fields.removeByName(name);
    collection.fields.add(new TextField({ name, required: false }));
  }

  if (!collection.indexes.some((index) => index.includes("idx_users_telegram_id"))) {
    collection.indexes.push(
      "CREATE UNIQUE INDEX idx_users_telegram_id ON users (telegram_id) WHERE telegram_id != ''",
    );
  }

  return app.save(collection);
}, (app) => {
  // Migración de reparación: no elimina campos de usuario al revertir.
});
