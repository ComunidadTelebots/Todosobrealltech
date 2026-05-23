/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const hilosCollection = app.findCollectionByNameOrId("nw3_foro_hilos");

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
        "id": "fr_rel_hilo",
        "name": "hilo",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "relation",
        "cascadeDelete": true,
        "collectionId": hilosCollection.id,
        "displayFields": [],
        "maxSelect": 1,
        "minSelect": 0
      },
      {
        "hidden": false,
        "id": "fr_text_autor",
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
        "id": "fr_text_contenido",
        "name": "contenido",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 5000,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "fr_autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "fr_autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_forresp0001",
    "indexes": [],
    "listRule": "",
    "name": "nw3_foro_respuestas",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("nw3_foro_respuestas already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_forresp0001");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("nw3_foro_respuestas not found, skipping revert");
      return;
    }
    throw e;
  }
})
