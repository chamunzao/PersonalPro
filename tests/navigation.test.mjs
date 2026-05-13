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
  ["payments", "alerts", "communication", "reports", "settings"],
  "secondary navigation keeps support screens under More without duplicating attendance"
);

assert.equal(isMoreSectionActive("payments"), true, "payments highlights More");
assert.equal(isMoreSectionActive("alerts"), true, "alerts highlights More");
assert.equal(isMoreSectionActive("dashboard"), false, "dashboard does not highlight More");
