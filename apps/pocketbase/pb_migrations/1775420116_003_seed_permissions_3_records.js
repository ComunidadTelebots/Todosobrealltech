/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("permissions");

  const record0 = new Record(collection);
    record0.set("role", "admin");
    record0.set("can_manage_bots", true);
    record0.set("can_manage_users", true);
    record0.set("can_access_admin", true);
    record0.set("can_view_stats", true);
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
    record1.set("role", "moderator");
    record1.set("can_manage_bots", true);
    record1.set("can_manage_users", false);
    record1.set("can_access_admin", false);
    record1.set("can_view_stats", true);
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
    record2.set("role", "user");
    record2.set("can_manage_bots", false);
    record2.set("can_manage_users", false);
    record2.set("can_access_admin", false);
    record2.set("can_view_stats", false);
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