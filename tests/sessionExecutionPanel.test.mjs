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
