import assert from "node:assert/strict";
import { shouldSaveAttendanceRemotely } from "../src/services/recordsPolicy.js";
import { DEMO_EMAIL } from "../src/services/demoData.js";

assert.equal(
  shouldSaveAttendanceRemotely({ email: DEMO_EMAIL }),
  false,
  "demo account attendance should stay local when bundled demo data is being used"
);

assert.equal(
  shouldSaveAttendanceRemotely({ email: "trainer@example.com" }),
  true,
  "regular account attendance should be saved to Firestore"
);
