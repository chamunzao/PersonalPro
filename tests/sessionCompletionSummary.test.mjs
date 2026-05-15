import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSessionCompletionSummary,
  buildWorkoutPlanUpdateFromExecuted
} from "../src/features/session/sessionCompletionSummary.js";

const plannedWorkout = {
  id: "plan-a",
  name: "Pernas",
  exercises: [
    { name: "Agachamento livre", sets: "2", reps: "10", weight: "40 kg", rest: "90s" }
  ]
};

const executedWorkout = {
  sourceWorkoutId: "plan-a",
  sourceWorkoutName: "Pernas",
  name: "Pernas",
  changes: [{ type: "add-exercises" }, { type: "create-group" }],
  groups: [
    { id: "g1", type: "biset", name: "Biset 1", exerciseIds: ["agachamento", "supino"] }
  ],
  exercises: [
    {
      executionId: "agachamento",
      name: "Agachamento livre",
      sets: "2",
      reps: "10",
      weight: "40 kg",
      rest: "90s",
      series: [
        { id: "agachamento-set-0", type: "normal", targetReps: "10", targetWeight: "40 kg" },
        {
          id: "agachamento-set-1",
          type: "drop-set",
          targetReps: "10",
          targetWeight: "42 kg",
          dropSteps: [
            { id: "main", label: "Serie principal", completed: true },
            { id: "drop-1", label: "Drop 1", completed: true }
          ]
        }
      ]
    },
    {
      executionId: "supino",
      name: "Supino reto",
      addedDuringSession: true,
      sets: "2",
      reps: "12",
      weight: "30 kg",
      rest: "75s",
      series: [
        { id: "supino-set-0", type: "normal", targetReps: "12", targetWeight: "30 kg" },
        { id: "supino-set-1", type: "normal", targetReps: "12", targetWeight: "32 kg" }
      ]
    }
  ]
};

const draft = {
  exerciseLogs: {
    0: {
      "agachamento-set-0": { repsDone: "10", weightDone: "40 kg", completed: true },
      "agachamento-set-1": { completed: true }
    },
    1: {
      "supino-set-0": { repsDone: "12", weightDone: "30 kg", completed: true }
    }
  },
  sessionCheckout: {
    effort: "Moderado",
    pain: "Sem dor",
    loadProgress: "Subiu carga",
    nextAction: "Manter biset"
  }
};

test("completion summary separates planned workout, executed workout and session changes", () => {
  const summary = buildSessionCompletionSummary({ plannedWorkout, executedWorkout, draft });

  assert.equal(summary.plannedWorkoutName, "Pernas");
  assert.equal(summary.executedWorkoutName, "Pernas");
  assert.equal(summary.completedSeriesLabel, "3/4 series concluídas");
  assert.deepEqual(summary.addedExercises, ["Supino reto"]);
  assert.deepEqual(summary.dropSets, ["Agachamento livre - Série 2"]);
  assert.deepEqual(summary.groups, ["Biset 1: Agachamento livre + Supino reto"]);
  assert.equal(summary.changeCount, 2);
  assert.equal(summary.checkoutLines.length, 4);
});

test("completion summary handles classes without active workout", () => {
  const summary = buildSessionCompletionSummary({ plannedWorkout: null, executedWorkout: null, draft: {} });

  assert.equal(summary.plannedWorkoutName, "Treino planejado");
  assert.equal(summary.executedWorkoutName, "Treino executado");
  assert.equal(summary.completedSeriesLabel, "0/0 series concluídas");
  assert.deepEqual(summary.addedExercises, []);
  assert.deepEqual(summary.dropSets, []);
  assert.deepEqual(summary.groups, []);
});

test("workout plan update from executed workout preserves explicit user choice", () => {
  const payload = buildWorkoutPlanUpdateFromExecuted(executedWorkout, "15/05/2026");

  assert.equal(payload.updatedFromSessionAt, "15/05/2026");
  assert.deepEqual(
    payload.exercises.map(exercise => exercise.name),
    ["Agachamento livre", "Supino reto"]
  );
  assert.equal(payload.exercises[0].sets, "2");
  assert.equal(payload.exercises[1].reps, "12");
});
