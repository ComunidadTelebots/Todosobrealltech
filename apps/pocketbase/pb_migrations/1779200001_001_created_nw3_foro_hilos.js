/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
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
        "id": "fh_text_titulo",
        "name": "titulo",
        "presentable": true,
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
        "id": "fh_text_categoria",
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
        "id": "fh_text_autor",
        "name": "autor_nombre",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 60,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "fh_text_contenido",
        "name": "contenido",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 10000,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "fh_num_vistas",
        "name": "vistas",
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
        "id": "fh_num_respcount",
        "name": "respuestas_count",
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
        "id": "fh_autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "fh_autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_forhilos001",
    "indexes": [],
    "listRule": "",
    "name": "nw3_foro_hilos",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("nw3_foro_hilos already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_forhilos001");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("nw3_foro_hilos not found, skipping revert");
      return;
    }
    throw e;
  }
})
