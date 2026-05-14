import assert from "node:assert/strict";
import {
  addExecutedExercise,
  addExecutedSet,
  addDropSetStep,
  createBisetGroup,
  createExecutedWorkoutFromPlan,
  duplicateExecutedSet,
  removeDropSetStep,
  undoDropSet,
  removeBisetGroup,
  removeExecutedSet,
  transformSetToDropSet,
  updateExecutedSetMeta,
  updateDropSetStep
} from "../src/features/session/sessionExecutedWorkout.js";

const plannedWorkout = {
  id: "plan-a",
  name: "Costas",
  exercises: [
    { name: "Remada aberta", sets: "2", reps: "8 - 10", weight: "30 kg", rest: "60s", notes: "Manter postura" },
    { name: "Puxada frontal", sets: "3", reps: "10", weight: "25 kg", rest: "45s" }
  ]
};

const executed = createExecutedWorkoutFromPlan(plannedWorkout);

assert.equal(executed.sourceWorkoutId, "plan-a", "executed workout should reference the planned workout");
assert.equal(executed.exercises[0].executionId, "exercise-0", "planned exercises should receive stable execution ids");
assert.equal(executed.exercises[0].series.length, 2, "planned set count should become executable series");
assert.equal(executed.exercises[0].series[0].targetReps, "8 - 10", "series should keep target reps");
assert.equal(executed.exercises[0].series[0].targetWeight, "30 kg", "series should keep target weight");

const withAddedSet = addExecutedSet(executed, "exercise-0");
assert.equal(withAddedSet.exercises[0].series.length, 3, "adding a set should append one series");
assert.equal(withAddedSet.exercises[0].series[2].targetReps, "8 - 10", "new series should copy target reps from previous series");
assert.equal(withAddedSet.exercises[0].series[2].completed, false, "new series should start incomplete");

const withDuplicatedSet = duplicateExecutedSet(withAddedSet, "exercise-0", "exercise-0-set-1");
assert.equal(withDuplicatedSet.exercises[0].series.length, 4, "duplicating a set should insert one series");
assert.equal(withDuplicatedSet.exercises[0].series[2].targetReps, "8 - 10", "duplicated series should copy target reps");
assert.equal(withDuplicatedSet.exercises[0].series[2].id, "exercise-0-set-1-copy-0", "duplicated series should receive a stable copy id");
assert.equal(withDuplicatedSet.exercises[0].series[2].completed, false, "duplicated series should start incomplete");

const withWarmup = updateExecutedSetMeta(withDuplicatedSet, "exercise-0", "exercise-0-set-1-copy-0", { type: "warmup", notes: "Sentiu ombro" });
assert.equal(withWarmup.exercises[0].series[2].type, "warmup", "series quick action should mark warmup");
assert.equal(withWarmup.exercises[0].series[2].notes, "Sentiu ombro", "series note should be editable");

const withRemovedSet = removeExecutedSet(withWarmup, "exercise-0", "exercise-0-set-1-copy-0");
assert.equal(withRemovedSet.exercises[0].series.length, 3, "removing a set should delete only the selected series");
assert.deepEqual(
  withRemovedSet.exercises[0].series.map(series => series.id),
  ["exercise-0-set-0", "exercise-0-set-1", "exercise-0-set-2"],
  "removing a duplicated series should preserve original series order"
);

const withDropSet = transformSetToDropSet(withAddedSet, "exercise-0", "exercise-0-set-1");
const dropSeries = withDropSet.exercises[0].series[1];
assert.equal(dropSeries.type, "drop-set", "selected series should become a drop set");
assert.deepEqual(
  dropSeries.dropSteps.map(step => step.label),
  ["Serie principal", "Drop 1", "Drop 2", "Drop 3"],
  "drop set should start with one main step and three drop steps"
);
assert.equal(dropSeries.dropSteps[0].role, "main", "first drop step should represent the main series");
assert.equal(withDropSet.exercises[0].series[0].type, "normal", "other series should remain normal");

const withDropStep = addDropSetStep(withDropSet, "exercise-0", "exercise-0-set-1");
assert.equal(withDropStep.exercises[0].series[1].dropSteps.length, 5, "drop set should allow extra steps");
assert.equal(withDropStep.exercises[0].series[1].dropSteps[4].label, "Drop 4", "new drop step should keep sequential labels");
assert.equal(withDropStep.exercises[0].series[1].dropSteps[4].completed, false, "new drop step should start incomplete");

const withEditedDropStep = updateDropSetStep(withDropStep, "exercise-0", "exercise-0-set-1", "exercise-0-set-1-drop-2", {
  weight: "20 kg",
  reps: "6",
  completed: true
});
assert.equal(withEditedDropStep.exercises[0].series[1].dropSteps[2].weight, "20 kg", "drop step weight should be editable");
assert.equal(withEditedDropStep.exercises[0].series[1].dropSteps[2].completed, true, "drop step completion should be editable");

const withRemovedDropStep = removeDropSetStep(withEditedDropStep, "exercise-0", "exercise-0-set-1", "exercise-0-set-1-drop-2");
assert.equal(withRemovedDropStep.exercises[0].series[1].dropSteps.length, 4, "drop set steps should be removable");
assert.equal(withRemovedDropStep.exercises[0].series[1].type, "drop-set", "removing a step should preserve the main drop set series");

const withoutDropSet = undoDropSet(withEditedDropStep, "exercise-0", "exercise-0-set-1");
assert.equal(withoutDropSet.exercises[0].series[1].type, "normal", "undoing a drop set should restore a normal series");
assert.equal(withoutDropSet.exercises[0].series[1].targetWeight, "30 kg", "undoing a drop set should preserve the main step weight when possible");
assert.equal(withoutDropSet.exercises[0].series[1].targetReps, "8 - 10", "undoing a drop set should preserve the main step reps when possible");
assert.deepEqual(
  withoutDropSet.exercises[0].series[1].dropStepsArchive.map(step => step.label),
  ["Serie principal", "Drop 1", "Drop 2", "Drop 3", "Drop 4"],
  "undoing a drop set should archive internal steps instead of deleting filled data"
);

const withInsertedExercise = addExecutedExercise(
  executed,
  { name: "Pullover", sets: "2", reps: "12", weight: "20 kg", rest: "45s", notes: "Controle total" },
  { afterExerciseId: "exercise-0" }
);

assert.deepEqual(
  withInsertedExercise.exercises.map(exercise => exercise.name),
  ["Remada aberta", "Pullover", "Puxada frontal"],
  "new exercises should be insertable between existing exercises"
);
assert.equal(withInsertedExercise.exercises[1].addedDuringSession, true, "new exercise should be marked as a session adaptation");
assert.equal(withInsertedExercise.exercises[1].series.length, 2, "new exercise should create configured series");

const withBiset = createBisetGroup(withInsertedExercise, ["exercise-0", withInsertedExercise.exercises[1].executionId]);
assert.equal(withBiset.groups.length, 1, "creating a biset should add one group");
assert.equal(withBiset.groups[0].type, "biset", "group should be marked as biset");
assert.deepEqual(withBiset.groups[0].exerciseIds, ["exercise-0", withInsertedExercise.exercises[1].executionId], "biset should keep exercise order");

const withoutBiset = removeBisetGroup(withBiset, withBiset.groups[0].id);
assert.equal(withoutBiset.groups.length, 0, "undoing a biset should remove only the group");
assert.equal(withoutBiset.exercises.length, 3, "undoing a biset should preserve exercises and data");
