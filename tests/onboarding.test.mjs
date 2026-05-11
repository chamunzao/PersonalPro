import assert from "node:assert/strict";
import { getOnboardingSteps, shouldShowOnboarding } from "../src/features/onboarding/onboardingSteps.js";

assert.equal(shouldShowOnboarding([]), true, "empty accounts show onboarding");
assert.equal(shouldShowOnboarding([{ id: "student-1" }]), false, "accounts with students skip onboarding");

assert.deepEqual(
  getOnboardingSteps().map(step => step.targetTab),
  ["students", "agenda", "payments", "session"],
  "onboarding follows the setup path from student to first class"
);

assert.deepEqual(
  getOnboardingSteps().map(step => step.title),
  ["Cadastre seu primeiro aluno", "Defina a agenda fixa", "Configure a cobrança", "Execute a primeira aula"],
  "onboarding uses practical action titles"
);
