import assert from "node:assert/strict";
import { loadSessionWorkoutEntries } from "../src/features/session/sessionWorkouts.js";

const studentsToLoad = [
  { studentId: "student-ok" },
  { studentId: "student-denied" }
];

const result = await loadSessionWorkoutEntries({
  studentsToLoad,
  isDemoAccount: false,
  getDemoWorkoutPlans: () => [{ id: "demo-plan" }],
  fetchWorkoutPlans: async (studentId) => {
    if (studentId === "student-denied") {
      throw new Error("permission denied");
    }
    return [{ id: "real-plan" }];
  }
});

assert.deepEqual(
  result.workoutsByStudent["student-ok"],
  [{ id: "real-plan" }],
  "successful students keep their loaded workout plans"
);

assert.deepEqual(
  result.workoutsByStudent["student-denied"],
  [],
  "a denied student does not break the whole class slot"
);

assert.equal(
  result.errorsByStudent["student-denied"].message,
  "permission denied",
  "load errors are kept per student so the UI can explain the problem"
);

const demoResult = await loadSessionWorkoutEntries({
  studentsToLoad: [{ studentId: "demo-student" }],
  isDemoAccount: true,
  getDemoWorkoutPlans: (studentId) => [{ id: `demo-${studentId}` }],
  fetchWorkoutPlans: async () => {
    throw new Error("permission denied");
  }
});

assert.deepEqual(
  demoResult.workoutsByStudent["demo-student"],
  [{ id: "demo-demo-student" }],
  "demo account still falls back to bundled workout plans"
);
