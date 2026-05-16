/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text1413711391",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number8821634501",
        "name": "message_id",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "number",
        "max": null,
        "min": 1,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "date3341782290",
        "name": "date",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "date",
        "max": "",
        "min": ""
      },
      {
        "hidden": false,
        "id": "text9912304512",
        "name": "text",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 10000,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "select4477102341",
        "name": "category",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "select",
        "maxSelect": 1,
        "values": ["IA", "Tecnología", "Ciberseguridad", "Gaming", "Otro"]
      },
      {
        "hidden": false,
        "id": "url2219874103",
        "name": "telegram_url",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "url",
        "exceptDomains": [],
        "onlyDomains": []
      },
      {
        "hidden": false,
        "id": "bool3317826401",
        "name": "has_photo",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "autodate0681503857",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate7718609372",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_telegram_posts01",
    "indexes": [
      "CREATE UNIQUE INDEX idx_telegram_message_id ON telegram_channel_posts (message_id)",
      "CREATE INDEX idx_telegram_category ON telegram_channel_posts (category)",
      "CREATE INDEX idx_telegram_date ON telegram_channel_posts (date)"
    ],
    "listRule": "",
    "name": "telegram_channel_posts",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("Collection already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_telegram_posts01");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
});
