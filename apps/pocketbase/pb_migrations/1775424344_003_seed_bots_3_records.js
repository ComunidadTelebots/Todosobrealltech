/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const record0 = new Record(collection);
    record0.set("user_id", "sample_user_001");
    record0.set("nombre", "Asistente de Soporte");
    record0.set("token", "token_soporte_001");
    record0.set("descripcion", "Bot para soporte t\u00e9cnico");
    record0.set("estado", true);
    record0.set("users", 0);
    record0.set("satisfaction", 0);
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("user_id", "sample_user_001");
    record1.set("nombre", "Bot de Ventas");
    record1.set("token", "token_ventas_001");
    record1.set("descripcion", "Bot especializado en ventas");
    record1.set("estado", true);
    record1.set("users", 0);
    record1.set("satisfaction", 0);
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record2 = new Record(collection);
    record2.set("user_id", "sample_user_001");
    record2.set("nombre", "Bot de Prueba");
    record2.set("token", "token_prueba_001");
    record2.set("descripcion", "Bot de prueba del sistema");
    record2.set("estado", false);
    record2.set("users", 0);
    record2.set("satisfaction", 0);
  try {
    app.save(record2);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})