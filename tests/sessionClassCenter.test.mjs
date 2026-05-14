import assert from "node:assert/strict";
import {
  buildSessionClassCenterSummary,
  getCurrentSessionExercise,
  getSessionWorkoutProgress
} from "../src/features/session/sessionClassCenter.js";

const workout = {
  name: "Costas",
  exercises: [
    {
      executionId: "remada",
      sourceExerciseIndex: 0,
      name: "Remada aberta",
      series: [
        { id: "remada-set-0", sourceSetIndex: 0, completed: false },
        { id: "remada-set-1", sourceSetIndex: 1, completed: false }
      ]
    },
    {
      executionId: "puxada",
      sourceExerciseIndex: 1,
      name: "Puxada frontal",
      series: [
        {
          id: "puxada-set-0",
          type: "drop-set",
          dropSteps: [
            { id: "drop-main", completed: true },
            { id: "drop-1", completed: true },
            { id: "drop-2", completed: true },
            { id: "drop-3", completed: true }
          ]
        }
      ]
    }
  ]
};

const draft = {
  exerciseLogs: {
    0: {
      0: { repsDone: "10", weightDone: "40 kg" }
    }
  }
};

assert.deepEqual(
  getSessionWorkoutProgress(workout, draft),
  { completed: 2, total: 3 },
  "center summary should count completed normal sets and completed drop-set series"
);

assert.equal(
  getCurrentSessionExercise(workout, draft).name,
  "Remada aberta",
  "current exercise should be the first exercise with pending series"
);

const summary = buildSessionClassCenterSummary({
  workout,
  draft,
  record: { status: "present" },
  studentSummary: {
    activeWorkoutName: "Costas",
    financialSeverity: "danger",
    financialLabel: "Mensalidade - Vencida",
    riskTags: [{ key: "injuries", label: "Lesao registrada" }],
    lastSessionNote: "Sentiu dor no ombro"
  }
});

assert.equal(summary.workoutName, "Costas", "summary should show active workout");
assert.equal(summary.currentExerciseName, "Remada aberta", "summary should show current exercise");
assert.equal(summary.progressLabel, "2/3 series", "summary should expose compact overall progress");
assert.equal(summary.statusLabel, "Registrar", "summary should invite registration when workout is in progress");
assert.deepEqual(
  summary.alerts,
  ["Mensalidade - Vencida", "Lesao registrada", "Obs. recente"],
  "summary should collect fast financial, risk and note alerts"
);

const editedButPendingProgress = getSessionWorkoutProgress(workout, {
  exerciseLogs: {
    0: {
      0: { repsDone: "10", weightDone: "40 kg" },
      "remada-set-1": { repsDone: "9", weightDone: "44 kg", completed: false }
    }
  }
});

assert.deepEqual(
  editedButPendingProgress,
  { completed: 2, total: 3 },
  "typed values marked as pending should not be counted as completed series"
);

const explicitlyCompletedDropProgress = getSessionWorkoutProgress(workout, {
  exerciseLogs: {
    0: {
      0: { repsDone: "10", weightDone: "40 kg" }
    },
    1: {
      "puxada-set-0": { repsDone: "12", weightDone: "35 kg", completed: true }
    }
  }
});

assert.deepEqual(
  explicitlyCompletedDropProgress,
  { completed: 2, total: 3 },
  "explicit completion should count a drop-set series even when its internal steps were created earlier"
);

const incompleteDropProgress = getSessionWorkoutProgress({
  ...workout,
  exercises: [
    workout.exercises[0],
    {
      ...workout.exercises[1],
      series: [
        {
          ...workout.exercises[1].series[0],
          dropSteps: [
            { id: "drop-main", completed: true },
            { id: "drop-1", completed: false }
          ]
        }
      ]
    }
  ]
}, draft);

assert.deepEqual(
  incompleteDropProgress,
  { completed: 1, total: 3 },
  "drop-set steps should belong to one main series and only count when every step is complete"
);
