import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExercisePickerFilters,
  filterExercisePickerLibrary,
  toggleExercisePickerSelection
} from "../src/features/session/sessionExercisePicker.js";

const library = [
  { name: "Agachamento livre", muscleGroup: "Pernas", equipment: "Barra" },
  { name: "Cadeira extensora", muscleGroup: "Quadriceps", equipment: "Maquina" },
  { name: "Supino reto", muscleGroup: "Peito", equipment: "Barra" },
  { name: "Triceps corda", muscleGroup: "Triceps", equipment: "Polia" }
];

test("exercise picker filters by search muscle and equipment", () => {
  assert.deepEqual(
    filterExercisePickerLibrary(library, { search: "supino" }).map(item => item.name),
    ["Supino reto"]
  );
  assert.deepEqual(
    filterExercisePickerLibrary(library, { muscleGroup: "Pernas", equipment: "Barra" }).map(item => item.name),
    ["Agachamento livre"]
  );
});

test("exercise picker builds muscle and equipment filter options", () => {
  assert.deepEqual(buildExercisePickerFilters(library).muscleGroups, ["Peito", "Pernas", "Quadriceps", "Triceps"]);
  assert.deepEqual(buildExercisePickerFilters(library).equipment, ["Barra", "Maquina", "Polia"]);
});

test("exercise picker toggles selection without duplicates", () => {
  assert.deepEqual(toggleExercisePickerSelection(["Supino reto"], "Agachamento livre"), ["Supino reto", "Agachamento livre"]);
  assert.deepEqual(toggleExercisePickerSelection(["Supino reto", "Agachamento livre"], "Supino reto"), ["Agachamento livre"]);
});
