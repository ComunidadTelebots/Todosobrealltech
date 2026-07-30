/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    app.findCollectionByNameOrId("feature_release_access");
    return;
  } catch (_) {
    // Create the isolated entitlement collection below.
  }
  const collection = new Collection({
    type: "base",
    name: "feature_release_access",
    listRule: "@request.auth.role = 'creator'",
    viewRule: "@request.auth.role = 'creator'",
    createRule: "@request.auth.role = 'creator'",
    updateRule: "@request.auth.role = 'creator'",
    deleteRule: "@request.auth.role = 'creator'",
    fields: [
      { name: "account_id", type: "text", required: true },
      { name: "telegram_id", type: "text", required: true },
      { name: "release_channel", type: "select", required: true, maxSelect: 1,
        values: ["stable", "rc", "beta", "alpha"] },
      { name: "enabled", type: "bool", required: false },
      { name: "assigned_by", type: "text", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_feature_release_account ON feature_release_access (account_id)",
      "CREATE UNIQUE INDEX idx_feature_release_telegram ON feature_release_access (telegram_id)",
    ],
  });
  return app.save(collection);
}, (app) => {
  try {
    return app.delete(app.findCollectionByNameOrId("feature_release_access"));
  } catch (_) {
    return null;
  }
});
