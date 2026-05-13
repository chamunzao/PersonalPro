import assert from "node:assert/strict";
import {
  getPrimaryNavigation,
  getMoreNavigation,
  isMoreSectionActive
} from "../src/appNavigation.js";

const primary = getPrimaryNavigation();
const more = getMoreNavigation();

assert.deepEqual(
  primary.map(item => item.id),
  ["dashboard", "session", "agenda", "students", "more"],
  "primary navigation keeps the main daily workflow visible"
);

assert.deepEqual(
  more.map(item => item.id),
  ["payments", "alerts", "communication", "workoutModels", "reports", "settings"],
  "secondary navigation keeps support screens under More without duplicating attendance"
);

assert.equal(
  more.find(item => item.id === "workoutModels")?.label,
  "Biblioteca de Treinos",
  "workout models navigation should use the approved user-facing label"
);

assert.equal(isMoreSectionActive("payments"), true, "payments highlights More");
assert.equal(isMoreSectionActive("alerts"), true, "alerts highlights More");
assert.equal(isMoreSectionActive("workoutModels"), true, "workout models highlights More");
assert.equal(isMoreSectionActive("dashboard"), false, "dashboard does not highlight More");
