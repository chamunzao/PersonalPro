import assert from "node:assert/strict";
import {
  buildWorkoutModelFromPlan,
  cloneModelToWorkoutPlan,
  getSystemWorkoutModels,
  normalizeWorkoutModel
} from "../src/features/workouts/workoutModelUtils.js";

const systemModels = getSystemWorkoutModels();

assert.equal(systemModels[0].source, "system", "system templates should be exposed as system models");
assert.ok(systemModels[0].exercises.length > 0, "system model should preserve exercises");

const normalized = normalizeWorkoutModel({
  id: "custom-1",
  name: "Forca basica",
  goal: "Forca",
  exercises: [{ name: "Supino reto", sets: "5", reps: "5" }]
});

assert.deepEqual(
  normalized.exercises[0],
  {
    name: "Supino reto",
    sets: "5",
    reps: "5",
    weight: "",
    rest: "",
    notes: "",
    muscleGroup: "",
    equipment: "",
    instructions: ""
  },
  "normalization should provide all workout exercise fields"
);

const workoutPlan = cloneModelToWorkoutPlan(normalized, {
  active: true,
  createdAt: "13/05/2026"
});

assert.equal(workoutPlan.name, "Forca basica", "cloned workout should keep model name");
assert.equal(workoutPlan.active, true, "cloned workout should respect active option");
assert.notEqual(
  workoutPlan.exercises[0],
  normalized.exercises[0],
  "cloned workout should not share exercise object references with the model"
);

const model = buildWorkoutModelFromPlan({
  name: "Treino atual",
  exercises: [{ name: "Agachamento livre", sets: "4", reps: "8", notes: "Boa tecnica" }]
}, {
  goal: "Hipertrofia",
  createdAt: "13/05/2026"
});

assert.equal(model.name, "Treino atual", "model from workout should keep plan name");
assert.equal(model.goal, "Hipertrofia", "model from workout should keep provided goal");
assert.equal(model.exercises[0].notes, "Boa tecnica", "model from workout should preserve exercise notes");
