import { WORKOUT_TEMPLATES } from "./workoutPresets.js";

const EMPTY_EXERCISE = {
  name: "",
  sets: "",
  reps: "",
  weight: "",
  rest: "",
  notes: "",
  muscleGroup: "",
  equipment: "",
  instructions: ""
};

function cleanText(value) {
  return String(value || "").trim();
}

function cloneExercise(exercise = {}) {
  return {
    ...EMPTY_EXERCISE,
    ...exercise,
    name: cleanText(exercise.name),
    sets: cleanText(exercise.sets),
    reps: cleanText(exercise.reps),
    weight: cleanText(exercise.weight),
    rest: cleanText(exercise.rest),
    notes: cleanText(exercise.notes),
    muscleGroup: cleanText(exercise.muscleGroup),
    equipment: cleanText(exercise.equipment),
    instructions: cleanText(exercise.instructions)
  };
}

export function normalizeWorkoutModel(model = {}) {
  return {
    id: model.id || "",
    name: cleanText(model.name),
    goal: cleanText(model.goal),
    level: cleanText(model.level),
    notes: cleanText(model.notes),
    source: model.source || "user",
    createdAt: model.createdAt || "",
    updatedAt: model.updatedAt || "",
    exercises: (model.exercises || []).map(cloneExercise).filter(exercise => exercise.name)
  };
}

export function getSystemWorkoutModels() {
  return WORKOUT_TEMPLATES.map(template => normalizeWorkoutModel({
    ...template,
    id: `system-${template.id}`,
    source: "system"
  }));
}

export function cloneModelToWorkoutPlan(model, options = {}) {
  const normalized = normalizeWorkoutModel(model);
  return {
    name: normalized.name,
    active: options.active !== false,
    createdAt: options.createdAt || "",
    sourceModelId: normalized.id,
    sourceModelType: normalized.source,
    exercises: normalized.exercises.map(cloneExercise)
  };
}

export function buildWorkoutModelFromPlan(plan = {}, options = {}) {
  return normalizeWorkoutModel({
    name: options.name || plan.name,
    goal: options.goal || "",
    level: options.level || "",
    notes: options.notes || "",
    source: "user",
    createdAt: options.createdAt || "",
    updatedAt: options.updatedAt || "",
    exercises: plan.exercises || []
  });
}
