import assert from "node:assert/strict";
import {
  EXERCISE_QUICK_ACTIONS,
  appendExerciseQuickAction
} from "../src/features/session/sessionExerciseQuickActions.js";

assert.deepEqual(
  EXERCISE_QUICK_ACTIONS.map(action => action.label),
  ["Subiu carga", "Manteve", "Sentiu dor", "Trocar"],
  "session quick actions should expose the expected exercise shortcuts"
);

assert.equal(
  appendExerciseQuickAction("", "loadUp"),
  "Aumentou carga nesta aula.",
  "quick action should fill an empty exercise note"
);

assert.equal(
  appendExerciseQuickAction("Fez aquecimento extra.", "pain"),
  "Fez aquecimento extra.\nRelatou dor/desconforto. Revisar exercicio.",
  "quick action should append to an existing exercise note"
);

assert.equal(
  appendExerciseQuickAction("Manteve carga/repeticoes.", "maintained"),
  "Manteve carga/repeticoes.",
  "quick action should not duplicate the same note"
);

assert.equal(
  appendExerciseQuickAction("Nota manual.", "unknown"),
  "Nota manual.",
  "unknown quick actions should keep the note unchanged"
);
