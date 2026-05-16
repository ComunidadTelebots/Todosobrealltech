/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bots");

  const record0 = new Record(collection);
    record0.set("user_id", "admin_user_id");
    record0.set("nombre", "Asistente de Soporte");
    record0.set("token", "support-bot-token-001");
    record0.set("descripcion", "Bot inteligente que responde preguntas frecuentes sobre productos y servicios");
    record0.set("estado", true);
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
    record1.set("user_id", "admin_user_id");
    record1.set("nombre", "Bot de Ventas");
    record1.set("token", "sales-bot-token-002");
    record1.set("descripcion", "Asistente de ventas que ayuda a los clientes a encontrar productos");
    record1.set("estado", true);
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
    record2.set("user_id", "admin_user_id");
    record2.set("nombre", "Bot de Prueba");
    record2.set("token", "test-bot-token-003");
    record2.set("descripcion", "Bot en fase de prueba");
    record2.set("estado", false);
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