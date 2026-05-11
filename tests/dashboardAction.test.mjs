import assert from "node:assert/strict";
import { getNextClassAction } from "../src/features/dashboard/dashboardActions.js";

const pending = { time: "07:00", studentName: "Ana Beatriz", attendance: null };
const registered = { time: "08:00", studentName: "Carla Souza", attendance: "present" };

assert.deepEqual(
  getNextClassAction([registered, pending]),
  {
    classItem: pending,
    label: "Abrir aula",
    statusLabel: "Pendente"
  },
  "next action prioritizes a class without attendance"
);

assert.deepEqual(
  getNextClassAction([registered]),
  {
    classItem: registered,
    label: "Revisar aula",
    statusLabel: "Registrada"
  },
  "next action can review the first registered class when the day is complete"
);

assert.equal(getNextClassAction([]), null, "days without classes do not show an action");
