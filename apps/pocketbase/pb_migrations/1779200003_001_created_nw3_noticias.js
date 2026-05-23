/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
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
        "id": "nn_text_titulo",
        "name": "titulo",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 200,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_text_slug",
        "name": "slug",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 120,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_text_categoria",
        "name": "categoria",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 60,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_text_fecha",
        "name": "fecha",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 40,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_text_contenido",
        "name": "contenido",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 20000,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_text_fuente_label",
        "name": "fuente_label",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 100,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "nn_url_fuente_url",
        "name": "fuente_url",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "url",
        "exceptDomains": [],
        "onlyDomains": []
      },
      {
        "hidden": false,
        "id": "nn_num_year",
        "name": "year",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "number",
        "max": null,
        "min": null,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "nn_autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "nn_autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_noticias0001",
    "indexes": [
      "CREATE UNIQUE INDEX idx_nw3_noticias_slug ON nw3_noticias (slug)"
    ],
    "listRule": "",
    "name": "nw3_noticias",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != ''",
    "viewRule": ""
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("nw3_noticias already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_noticias0001");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("nw3_noticias not found, skipping revert");
      return;
    }
    throw e;
  }
})
