import assert from "node:assert/strict";
import {
  buildSessionExecutionPanel,
  completeCurrentSessionSet,
  stepCurrentSessionSetValue,
  updateCurrentSessionSetValue
} from "../src/features/session/sessionExecutionPanel.js";

const workout = {
  name: "Costas",
  exercises: [
    {
      executionId: "remada",
      name: "Remada aberta",
      rest: "60s",
      series: [
        { id: "remada-set-0", sourceSetIndex: 0, targetReps: "10", targetWeight: "40 kg", rest: "60s" },
        { id: "remada-set-1", sourceSetIndex: 1, targetReps: "10", targetWeight: "42 kg", rest: "60s" }
      ]
    },
    {
      executionId: "puxada",
      name: "Puxada frontal",
      series: [
        { id: "puxada-set-0", sourceSetIndex: 0, targetReps: "12", targetWeight: "35 kg" }
      ]
    }
  ]
};

const draft = {
  exerciseLogs: {
    0: {
      "remada-set-0": { repsDone: "10", weightDone: "40 kg" }
    }
  }
};

const panel = buildSessionExecutionPanel({ workout, draft });

assert.equal(panel.exerciseName, "Remada aberta", "panel should focus the first exercise with pending series");
assert.equal(panel.seriesTitle, "Serie 2", "panel should focus the next pending series");
assert.equal(panel.weightValue, "", "panel should keep empty editable value before registration");
assert.equal(panel.weightPlaceholder, "42 kg", "panel should show target weight as placeholder");
assert.equal(panel.repsPlaceholder, "10", "panel should show target reps as placeholder");
assert.equal(panel.canComplete, false, "panel should not allow completing a set without typed weight and reps");
assert.equal(panel.restLabel, "60s", "panel should expose rest from the current series");
assert.equal(panel.exerciseProgressLabel, "1/2 series", "panel should show exercise progress");
assert.equal(panel.workoutProgressLabel, "1/3 series", "panel should show workout progress");

const completedDraft = completeCurrentSessionSet(draft, panel);

assert.equal(completedDraft.exerciseLogs[0]["remada-set-1"], undefined, "complete action should not use placeholders as real data");
assert.equal(
  completedDraft.exerciseLogs[0]["remada-set-0"].weightDone,
  "40 kg",
  "complete action should preserve previous set data"
);

const editedDraft = updateCurrentSessionSetValue(draft, panel, "weightDone", "44 kg");

assert.equal(
  editedDraft.exerciseLogs[0]["remada-set-1"].weightDone,
  "44 kg",
  "panel field updates should target only the focused current set"
);
assert.equal(
  editedDraft.exerciseLogs[0]["remada-set-1"].completed,
  false,
  "editing a current set should keep it pending until explicit completion"
);
assert.equal(
  buildSessionExecutionPanel({ workout, draft: editedDraft }).seriesTitle,
  "Serie 2",
  "typing only weight should not advance to the next set"
);

const readyDraft = updateCurrentSessionSetValue(editedDraft, panel, "repsDone", "9");
const readyPanel = buildSessionExecutionPanel({ workout, draft: readyDraft });

assert.equal(readyPanel.canComplete, true, "panel should allow completion after weight and reps are typed");

const explicitlyCompletedDraft = completeCurrentSessionSet(readyDraft, readyPanel);

assert.equal(
  explicitlyCompletedDraft.exerciseLogs[0]["remada-set-1"].completed,
  true,
  "complete action should explicitly mark the current set as completed"
);

const steppedDraft = stepCurrentSessionSetValue(draft, panel, "weightDone", 2.5);

assert.equal(
  steppedDraft.exerciseLogs[0]["remada-set-1"].weightDone,
  "44,5",
  "step buttons should adjust numeric values from the target placeholder"
);
assert.equal(
  buildSessionExecutionPanel({ workout, draft: steppedDraft }).seriesTitle,
  "Serie 2",
  "step buttons should not complete or advance the current set by themselves"
);

const dropWorkout = {
  name: "Costas",
  exercises: [
    {
      executionId: "remada",
      name: "Remada aberta",
      series: [
        {
          id: "remada-drop",
          type: "drop-set",
          targetReps: "10",
          targetWeight: "42 kg",
          dropSteps: [
            { id: "drop-main", label: "Serie principal", weight: "42 kg", reps: "10", completed: true },
            { id: "drop-1", label: "Drop 1", weight: "36 kg", reps: "8", completed: true },
            { id: "drop-2", label: "Drop 2", weight: "30 kg", reps: "6", completed: true },
            { id: "drop-3", label: "Drop 3", weight: "24 kg", reps: "4", completed: true }
          ]
        }
      ]
    },
    {
      executionId: "puxada",
      name: "Puxada frontal",
      series: [
        { id: "puxada-set-0", targetReps: "12", targetWeight: "35 kg" }
      ]
    }
  ]
};

const nextAfterDrop = buildSessionExecutionPanel({ workout: dropWorkout, draft: {} });

assert.equal(
  nextAfterDrop.exerciseName,
  "Puxada frontal",
  "a drop set with all internal steps complete should advance to the next pending series"
);

const incompleteDropWorkout = {
  ...dropWorkout,
  exercises: [
    {
      ...dropWorkout.exercises[0],
      series: [
        {
          ...dropWorkout.exercises[0].series[0],
          dropSteps: [
            { id: "drop-main", label: "Serie principal", weight: "42 kg", reps: "10", completed: true },
            { id: "drop-1", label: "Drop 1", weight: "36 kg", reps: "8", completed: false }
          ]
        }
      ]
    },
    dropWorkout.exercises[1]
  ]
};
const incompleteDropPanel = buildSessionExecutionPanel({ workout: incompleteDropWorkout, draft: {} });
assert.equal(incompleteDropPanel.canComplete, false, "drop set should wait for all internal steps before completing the main series");
assert.equal(incompleteDropPanel.dropSteps.length, 2, "drop set panel should expose internal steps without counting them as normal series");
assert.equal(incompleteDropPanel.dropSteps[0].label, "Serie principal", "drop set panel should identify the main step");

const bisetWorkout = {
  name: "Pernas",
  groups: [
    { id: "group-1", type: "biset", name: "Biset 1", exerciseIds: ["extensora", "flexora"] }
  ],
  exercises: [
    {
      executionId: "extensora",
      name: "Cadeira extensora",
      series: [
        { id: "extensora-set-0", targetReps: "12", targetWeight: "30 kg" }
      ]
    },
    {
      executionId: "flexora",
      name: "Mesa flexora",
      series: [
        { id: "flexora-set-0", targetReps: "12", targetWeight: "25 kg" }
      ]
    }
  ]
};

const bisetPanel = buildSessionExecutionPanel({ workout: bisetWorkout, draft: {} });

assert.equal(bisetPanel.groupLabel, "Biset 1", "execution panel should follow the current biset group");
assert.deepEqual(
  bisetPanel.groupExercises.map(exercise => exercise.name),
  ["Cadeira extensora", "Mesa flexora"],
  "execution panel should expose the exercises connected to the current biset"
);

const bisetRoundWorkout = {
  name: "Pernas",
  groups: [
    { id: "group-1", type: "biset", name: "Biset 1", exerciseIds: ["agachamento", "supino"] }
  ],
  exercises: [
    {
      executionId: "agachamento",
      name: "Agachamento livre",
      series: [
        { id: "agachamento-set-0", targetReps: "10", targetWeight: "40 kg" },
        { id: "agachamento-set-1", targetReps: "10", targetWeight: "42 kg" }
      ]
    },
    {
      executionId: "supino",
      name: "Supino reto",
      series: [
        { id: "supino-set-0", targetReps: "12", targetWeight: "30 kg" },
        { id: "supino-set-1", targetReps: "12", targetWeight: "32 kg" }
      ]
    }
  ]
};

const bisetRoundPanel = buildSessionExecutionPanel({ workout: bisetRoundWorkout, draft: {} });

assert.equal(bisetRoundPanel.isGroupSet, true, "biset execution should use a group round panel");
assert.equal(bisetRoundPanel.seriesTitle, "Rodada 1/2", "biset panel should advance by round");
assert.equal(bisetRoundPanel.groupProgressLabel, "0/2 rodadas concluidas", "biset panel should show round progress");
assert.deepEqual(
  bisetRoundPanel.groupSetEntries.map(entry => ({
    exerciseName: entry.exerciseName,
    weightPlaceholder: entry.weightPlaceholder,
    repsPlaceholder: entry.repsPlaceholder
  })),
  [
    { exerciseName: "Agachamento livre", weightPlaceholder: "40 kg", repsPlaceholder: "10" },
    { exerciseName: "Supino reto", weightPlaceholder: "30 kg", repsPlaceholder: "12" }
  ],
  "biset panel should expose editable fields for both exercises in the current round"
);

let bisetDraft = updateCurrentSessionSetValue({}, bisetRoundPanel, "weightDone", "40 kg", { entryId: "agachamento" });
bisetDraft = updateCurrentSessionSetValue(bisetDraft, bisetRoundPanel, "repsDone", "10", { entryId: "agachamento" });
bisetDraft = updateCurrentSessionSetValue(bisetDraft, bisetRoundPanel, "weightDone", "30 kg", { entryId: "supino" });
bisetDraft = updateCurrentSessionSetValue(bisetDraft, bisetRoundPanel, "repsDone", "12", { entryId: "supino" });

const readyBisetRoundPanel = buildSessionExecutionPanel({ workout: bisetRoundWorkout, draft: bisetDraft });
assert.equal(readyBisetRoundPanel.canComplete, true, "biset should be completable after both exercises have weight and reps");

const completedBisetDraft = completeCurrentSessionSet(bisetDraft, readyBisetRoundPanel);

assert.equal(completedBisetDraft.exerciseLogs[0]["agachamento-set-0"].completed, true, "completing biset should complete the first exercise series");
assert.equal(completedBisetDraft.exerciseLogs[1]["supino-set-0"].completed, true, "completing biset should complete the second exercise series");

const nextBisetRoundPanel = buildSessionExecutionPanel({ workout: bisetRoundWorkout, draft: completedBisetDraft });
assert.equal(nextBisetRoundPanel.seriesTitle, "Rodada 2/2", "after completing a biset round, the next round should appear");
assert.equal(nextBisetRoundPanel.groupProgressLabel, "1/2 rodadas concluidas", "biset progress should advance by round");
