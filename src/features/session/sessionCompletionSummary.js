import { buildSessionCheckoutSummary } from "./sessionCheckoutUtils.js";

function isSeriesCompleted(series = {}, setLog = {}) {
  if (setLog.completed === true) return true;
  if (setLog.completed === false) return false;
  if (series.type === "drop-set" && Array.isArray(series.dropSteps) && series.dropSteps.length) {
    return series.dropSteps.every(step => step.completed);
  }
  return Boolean(series.completed);
}

function getSetLog(exerciseLog = {}, series = {}, index = 0) {
  return exerciseLog[series.id] || exerciseLog[series.sourceSetIndex] || exerciseLog[index] || {};
}

function getGroupLabel(group = {}, index = 0) {
  if (group.name) return group.name;
  return group.type === "superset" ? `Superserie ${index + 1}` : `Biset ${index + 1}`;
}

export function buildSessionCompletionSummary({ plannedWorkout = {}, executedWorkout = null, draft = {} } = {}) {
  const planned = plannedWorkout || {};
  const workout = executedWorkout || planned;
  const exerciseLogs = draft.exerciseLogs || {};
  let completedSeries = 0;
  let totalSeries = 0;
  const dropSets = [];

  (workout.exercises || []).forEach((exercise, exerciseIndex) => {
    const series = exercise.series || [];
    totalSeries += series.length || Number.parseInt(String(exercise.sets || "1"), 10) || 1;
    series.forEach((item, seriesIndex) => {
      const setLog = getSetLog(exerciseLogs[exerciseIndex], item, seriesIndex);
      if (isSeriesCompleted(item, setLog)) completedSeries += 1;
      if (item.type === "drop-set") dropSets.push(`${exercise.name} - Série ${seriesIndex + 1}`);
    });
  });

  const groups = (workout.groups || []).map((group, index) => {
    const names = (group.exerciseIds || [])
      .map(exerciseId => (workout.exercises || []).find(exercise => exercise.executionId === exerciseId)?.name)
      .filter(Boolean);
    return `${getGroupLabel(group, index)}: ${names.join(" + ")}`;
  });

  return {
    plannedWorkoutName: planned.name || executedWorkout?.sourceWorkoutName || "Treino planejado",
    executedWorkoutName: workout.name || "Treino executado",
    completedSeries,
    totalSeries,
    completedSeriesLabel: `${completedSeries}/${totalSeries} series concluídas`,
    addedExercises: (workout.exercises || []).filter(exercise => exercise.addedDuringSession).map(exercise => exercise.name),
    dropSets,
    groups,
    changeCount: (workout.changes || []).length,
    checkoutLines: buildSessionCheckoutSummary(draft.sessionCheckout).split("\n").filter(line => line.startsWith("- "))
  };
}

export function buildWorkoutPlanUpdateFromExecuted(executedWorkout = {}, selectedDateBR = "") {
  return {
    name: executedWorkout.sourceWorkoutName || executedWorkout.name || "Treino atualizado",
    active: true,
    updatedAt: selectedDateBR,
    updatedFromSessionAt: selectedDateBR,
    exercises: (executedWorkout.exercises || []).map(exercise => ({
      name: exercise.name || "",
      sets: exercise.sets || String(exercise.series?.length || 1),
      reps: exercise.reps || exercise.series?.[0]?.targetReps || "",
      weight: exercise.weight || exercise.series?.[0]?.targetWeight || "",
      rest: exercise.rest || exercise.series?.[0]?.rest || "",
      notes: exercise.notes || "",
      muscleGroup: exercise.muscleGroup || "",
      equipment: exercise.equipment || "",
      instructions: exercise.instructions || "",
      technique: exercise.technique || "",
      groupName: exercise.groupName || ""
    }))
  };
}
