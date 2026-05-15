import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSessionExerciseGroupBlocks,
  getExerciseGroupCandidateIds,
  getExerciseGroupLabel
} from "../src/features/session/sessionExerciseGroups.js";

const exercises = [
  { executionId: "ex-1", name: "Supino reto", series: [{ id: "s1" }] },
  { executionId: "ex-2", name: "Crucifixo", series: [{ id: "s2" }] },
  { executionId: "ex-3", name: "Triceps corda", series: [{ id: "s3" }] },
  { executionId: "ex-4", name: "Abdominal", series: [{ id: "s4" }] }
];

test("exercise group labels distinguish biset and superset", () => {
  assert.equal(getExerciseGroupLabel({ type: "biset" }, 0), "Biset 1");
  assert.equal(getExerciseGroupLabel({ type: "superset" }, 1), "Superserie 2");
  assert.equal(getExerciseGroupLabel({ name: "Bloco abdomen", type: "superset" }, 0), "Bloco abdomen");
});

test("group blocks keep grouped exercises visually together without losing standalone exercises", () => {
  const blocks = buildSessionExerciseGroupBlocks({
    exercises,
    groups: [
      { id: "g1", type: "superset", exerciseIds: ["ex-2", "ex-1", "ex-3"] }
    ]
  });

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "group");
  assert.equal(blocks[0].label, "Superserie 1");
  assert.deepEqual(blocks[0].exercises.map(item => item.name), ["Crucifixo", "Supino reto", "Triceps corda"]);
  assert.equal(blocks[1].type, "exercise");
  assert.equal(blocks[1].exercise.name, "Abdominal");
});

test("group blocks ignore incomplete groups and keep exercise order stable", () => {
  const blocks = buildSessionExerciseGroupBlocks({
    exercises,
    groups: [
      { id: "g1", type: "biset", exerciseIds: ["ex-2"] }
    ]
  });

  assert.deepEqual(
    blocks.map(block => block.type === "exercise" ? block.exercise.name : block.label),
    ["Supino reto", "Crucifixo", "Triceps corda", "Abdominal"]
  );
});

test("group candidates come from the current exercise and following exercises", () => {
  assert.deepEqual(
    getExerciseGroupCandidateIds(exercises, 1, 2),
    ["ex-2", "ex-3"]
  );
  assert.deepEqual(
    getExerciseGroupCandidateIds(exercises, 1, 3),
    ["ex-2", "ex-3", "ex-4"]
  );
  assert.deepEqual(
    getExerciseGroupCandidateIds(exercises, 3, 2),
    [],
    "a group should not be created silently when there are not enough following exercises"
  );
});
