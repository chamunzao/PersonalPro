import assert from "node:assert/strict";
import {
  applySessionSetAction,
  buildSessionSetRows,
  buildSessionWorkoutRows
} from "../src/features/session/sessionWorkoutLayout.js";

const rows = buildSessionWorkoutRows({
  exercises: [
    { name: "Remada aberta", sets: "4", reps: "8 - 10", weight: "30 kg", rest: "60s", muscleGroup: "Costas" },
    { name: "Puxada frontal", sets: "3", reps: "10", technique: "drop-set" },
    { name: "Rosca direta", sets: "4", reps: "12", technique: "biset", groupName: "Bíceps A" }
  ],
  draft: {
    exerciseLogs: {
      0: {
        0: { repsDone: "10", weightDone: "30 kg" },
        1: { repsDone: "", weightDone: "" }
      }
    }
  }
});

assert.equal(rows[0].letter, "R", "row should expose an exercise avatar letter");
assert.equal(rows[0].prescription, "4 séries x 8 - 10 reps · 30 kg · descanso 60s", "row should summarize prescription compactly");
assert.equal(rows[0].progressLabel, "1/4 séries feitas", "row should summarize completed sets");
assert.equal(rows[0].metaLabel, "Costas", "row should include muscle/equipment metadata when available");

assert.equal(rows[1].techniqueLabel, "Drop set", "drop set should be shown as a training method tag");
assert.equal(rows[2].techniqueLabel, "Biset", "biset should be shown as a training method tag");
assert.equal(rows[2].groupLabel, "Bíceps A", "exercise groups should keep their visible label");

const setRows = buildSessionSetRows({
  exercise: { sets: "3", reps: "8 - 10", weight: "40 kg", technique: "drop-set" },
  exerciseLog: {
    0: { repsDone: "10", weightDone: "42 kg" }
  }
});

assert.deepEqual(
  setRows[0],
  {
    index: 0,
    title: "Série 1",
    typeLabel: "Drop set",
    targetLabel: "8 - 10 reps",
    repsValue: "10",
    weightValue: "42 kg",
    repsPlaceholder: "8 - 10",
    weightPlaceholder: "40 kg"
  },
  "set rows should expose horizontal card data for the active class UI"
);

const withDropSet = applySessionSetAction({}, "drop-set");
assert.equal(withDropSet.setTechniques[0], "drop-set", "drop-set action should mark the selected set as drop set in the current class");

const withDuplicate = applySessionSetAction({ extraSets: 1 }, "duplicate-set");
assert.equal(withDuplicate.extraSets, 2, "duplicate action should add another visible set");

const withRemove = applySessionSetAction({ extraSets: 2 }, "remove-set");
assert.equal(withRemove.extraSets, 1, "remove action should remove the last duplicated set first");

const adjustedSetRows = buildSessionSetRows({
  exercise: { sets: "2", reps: "10", weight: "40 kg" },
  adjustment: applySessionSetAction(applySessionSetAction({}, "biset", 1), "duplicate-set", 1)
});

assert.equal(adjustedSetRows.length, 3, "set rows should include duplicated sets from class adjustments");
assert.equal(adjustedSetRows[0].typeLabel, "Normal", "set action should not change previous sets");
assert.equal(adjustedSetRows[1].typeLabel, "Biset", "set action should only update the selected set");
assert.equal(adjustedSetRows[2].typeLabel, "Biset", "duplicated set should keep the selected set technique");

const duplicatedSetRows = buildSessionSetRows({
  exercise: { sets: "1", reps: "10", weight: "40 kg" },
  exerciseLog: {
    0: { repsDone: "12", weightDone: "45 kg" }
  },
  adjustment: applySessionSetAction({}, "duplicate-set", 0)
});

assert.equal(duplicatedSetRows.length, 2, "duplicating a set should add one visible set");
assert.equal(duplicatedSetRows[1].repsValue, "12", "duplicated set should reuse the previous reps done");
assert.equal(duplicatedSetRows[1].weightValue, "45 kg", "duplicated set should reuse the previous weight done");

const setSpecificDropRows = buildSessionSetRows({
  exercise: { sets: "3", reps: "8 - 10", weight: "30 kg" },
  adjustment: applySessionSetAction({}, "drop-set", 1)
});

assert.equal(setSpecificDropRows[0].typeLabel, "Normal", "drop set action should not affect earlier sets");
assert.equal(setSpecificDropRows[1].typeLabel, "Drop set", "drop set action should label the selected set");
assert.equal(setSpecificDropRows[2].typeLabel, "Normal", "drop set action should not affect later sets");

const duplicateMiddleSetRows = buildSessionSetRows({
  exercise: { sets: "3", reps: "8 - 10", weight: "30 kg" },
  adjustment: applySessionSetAction({}, "duplicate-set", 1)
});

assert.equal(duplicateMiddleSetRows.length, 4, "duplicating a middle set should add one visible set");
assert.equal(duplicateMiddleSetRows[0].title, "Série 1", "first original set should stay first");
assert.equal(duplicateMiddleSetRows[1].title, "Série 2", "selected original set should stay before its duplicate");
assert.equal(duplicateMiddleSetRows[2].index, "extra-1-0", "duplicated set should keep a stable extra set id");
assert.equal(duplicateMiddleSetRows[3].title, "Série 4", "later original set should move after the duplicate");

const extraDropAdjustment = applySessionSetAction(
  applySessionSetAction({}, "duplicate-set", 1),
  "drop-set",
  "extra-1-0"
);
const extraDropRows = buildSessionSetRows({
  exercise: { sets: "3", reps: "8 - 10", weight: "30 kg" },
  adjustment: extraDropAdjustment
});

assert.equal(extraDropRows[1].typeLabel, "Normal", "drop set on a duplicate should not affect its source set");
assert.equal(extraDropRows[2].typeLabel, "Drop set", "drop set should apply to the selected duplicate set");

const pendingTypedRows = buildSessionWorkoutRows({
  exercises: [
    { name: "Remada aberta", sets: "2", reps: "10", weight: "40 kg" }
  ],
  draft: {
    exerciseLogs: {
      0: {
        0: { repsDone: "10", weightDone: "40 kg", completed: true },
        1: { repsDone: "9", weightDone: "42 kg", completed: false }
      }
    }
  }
});

assert.equal(
  pendingTypedRows[0].progressLabel,
  "1/2 séries feitas",
  "typing weight or reps in the execution panel should not count as a completed set until completion is explicit"
);

const executedRows = buildSessionSetRows({
  exercise: {
    series: [
      { id: "s1", type: "normal", targetReps: "10", targetWeight: "40 kg", rest: "60s" },
      { id: "s-warm", type: "warmup", targetReps: "15", targetWeight: "20 kg", rest: "30s", notes: "Mobilidade" },
      {
        id: "s2",
        type: "drop-set",
        targetReps: "8",
        targetWeight: "35 kg",
        dropSteps: [
          { id: "d1", weight: "35 kg", reps: "8", completed: true },
          { id: "d2", weight: "25 kg", reps: "6", completed: false }
        ]
      }
    ]
  },
  exerciseLog: {
    0: { repsDone: "10", weightDone: "42 kg" }
  }
});

assert.equal(executedRows[0].index, "s1", "executed workout rows should use stable series ids");
assert.equal(executedRows[0].weightValue, "42 kg", "executed rows should keep legacy index-based logs");
assert.equal(executedRows[1].typeLabel, "Aquecimento", "executed workout warmups should keep their visible label");
assert.equal(executedRows[1].note, "Mobilidade", "set rows should expose series notes");
assert.equal(executedRows[2].typeLabel, "Drop set", "executed workout drop sets should keep their visible label");
assert.equal(executedRows[2].dropSteps.length, 2, "drop set rows should expose nested drop steps");
