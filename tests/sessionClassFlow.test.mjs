import assert from "node:assert/strict";
import { getSessionFlowSections } from "../src/features/session/sessionClassFlow.js";

const sections = getSessionFlowSections({
  hasWorkout: true,
  hasSessionChanges: true,
  recordStatus: "present"
});

assert.deepEqual(
  sections.map(section => section.id),
  ["before", "during", "after"],
  "session flow should keep before, during and after class sections in order"
);

assert.equal(sections[0].title, "Antes da aula", "first section should orient preparation");
assert.equal(sections[1].title, "Durante a aula", "second section should orient execution");
assert.equal(sections[2].title, "Depois da aula", "third section should orient closing");
assert.equal(sections[0].state, "ready", "before class should be ready when a workout exists");
assert.equal(sections[1].state, "active", "during class should be active after attendance is present");
assert.equal(sections[2].state, "ready", "after class should be ready when the draft has changes");

const missingWorkoutSections = getSessionFlowSections({
  hasWorkout: false,
  hasSessionChanges: false,
  recordStatus: ""
});

assert.equal(
  missingWorkoutSections[0].state,
  "attention",
  "before class should call attention when the student has no active workout"
);
assert.equal(
  missingWorkoutSections[2].state,
  "waiting",
  "after class should wait until there are notes or exercise changes to save"
);
