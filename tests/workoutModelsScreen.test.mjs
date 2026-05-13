import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync("src/App.jsx", "utf8");
const workoutModelsTab = readFileSync("src/features/workouts/WorkoutModelsTab.jsx", "utf8");

assert.match(
  app,
  /import \{ WorkoutModelsTab \} from '\.\/features\/workouts\/WorkoutModelsTab'/,
  "app should import the workout models screen"
);

assert.match(
  app,
  /activeTab === "workoutModels" && <WorkoutModelsTab/,
  "app should render the workout models screen from More"
);

assert.match(
  workoutModelsTab,
  /Biblioteca de Treinos/,
  "models screen should use the approved kicker"
);

assert.match(
  workoutModelsTab,
  /Seu espaço de treinos/,
  "models screen should use the approved title"
);

assert.match(
  workoutModelsTab,
  /Crie, edite e duplique treinos para aplicar nos alunos\./,
  "models screen should use the approved supporting text"
);

assert.match(
  workoutModelsTab,
  /getSystemWorkoutModels\(\)/,
  "models screen should list system workout models"
);

assert.match(
  workoutModelsTab,
  /users\/\$\{user\.uid\}\/workoutModels/,
  "models screen should load and persist user workout models"
);

assert.match(
  workoutModelsTab,
  /Duplicar/,
  "models screen should allow duplicating a model as a user model"
);

assert.match(
  workoutModelsTab,
  /Salvar modelo/,
  "models screen should allow creating or editing a user model"
);
