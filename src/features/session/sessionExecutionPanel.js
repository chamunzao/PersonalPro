function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function getSeries(exercise = {}) {
  if (Array.isArray(exercise.series) && exercise.series.length) return exercise.series;

  const count = Math.max(parseInt(String(exercise.sets || "").match(/\d+/)?.[0] || "1", 10) || 1, 1);
  return Array.from({ length: count }).map((_, index) => ({
    id: index,
    sourceSetIndex: index,
    targetReps: exercise.reps || "",
    targetWeight: exercise.weight || "",
    rest: exercise.rest || ""
  }));
}

function getExerciseLog(draft = {}, exerciseIndex) {
  return draft.exerciseLogs?.[exerciseIndex] || {};
}

function getSetLog(exerciseLog = {}, series = {}, seriesIndex) {
  return exerciseLog[series.id] || exerciseLog[series.sourceSetIndex] || exerciseLog[seriesIndex] || {};
}

function isSetCompleted(series = {}, setLog = {}) {
  if (setLog.completed === true) return true;
  if (setLog.completed === false) return false;

  if (series.type === "drop-set" && Array.isArray(series.dropSteps) && series.dropSteps.length) {
    return series.dropSteps.every(step => step.completed);
  }

  return Boolean(series.completed) || hasValue(setLog.repsDone) || hasValue(setLog.weightDone);
}

function getWorkoutProgress(workout = {}, draft = {}) {
  return (workout.exercises || []).reduce((progress, exercise, exerciseIndex) => {
    const series = getSeries(exercise);
    const exerciseLog = getExerciseLog(draft, exerciseIndex);
    const completed = series.filter((item, seriesIndex) => (
      isSetCompleted(item, getSetLog(exerciseLog, item, seriesIndex))
    )).length;

    return {
      completed: progress.completed + completed,
      total: progress.total + series.length
    };
  }, { completed: 0, total: 0 });
}

function findCurrentSet(workout = {}, draft = {}) {
  for (const [exerciseIndex, exercise] of (workout.exercises || []).entries()) {
    const series = getSeries(exercise);
    const exerciseLog = getExerciseLog(draft, exerciseIndex);
    const pendingIndex = series.findIndex((item, seriesIndex) => (
      !isSetCompleted(item, getSetLog(exerciseLog, item, seriesIndex))
    ));

    if (pendingIndex >= 0) {
      return { exerciseIndex, exercise, series, seriesIndex: pendingIndex, set: series[pendingIndex], exerciseLog };
    }
  }

  const exercise = workout.exercises?.[0] || null;
  const series = exercise ? getSeries(exercise) : [];
  return exercise ? { exerciseIndex: 0, exercise, series, seriesIndex: 0, set: series[0], exerciseLog: getExerciseLog(draft, 0) } : null;
}

export function buildSessionExecutionPanel({ workout = {}, draft = {} } = {}) {
  const current = findCurrentSet(workout, draft);
  if (!current) return null;

  const { exerciseIndex, exercise, series, seriesIndex, set, exerciseLog } = current;
  const setLog = getSetLog(exerciseLog, set, seriesIndex);
  const exerciseCompleted = series.filter((item, index) => (
    isSetCompleted(item, getSetLog(exerciseLog, item, index))
  )).length;
  const workoutProgress = getWorkoutProgress(workout, draft);
  const setKey = set?.id ?? seriesIndex;

  return {
    exerciseIndex,
    exerciseId: exercise.executionId || `exercise-${exerciseIndex}`,
    exerciseName: exercise.name || "Exercicio",
    seriesIndex,
    setKey,
    seriesTitle: `Serie ${seriesIndex + 1}`,
    repsValue: setLog.repsDone || "",
    weightValue: setLog.weightDone || "",
    repsPlaceholder: set?.targetReps || exercise.reps || "10",
    weightPlaceholder: set?.targetWeight || exercise.weight || "Carga",
    canComplete: hasValue(setLog.repsDone) && hasValue(setLog.weightDone),
    restLabel: set?.rest || exercise.rest || "Sem descanso",
    exerciseProgressLabel: `${exerciseCompleted}/${series.length} series`,
    workoutProgressLabel: `${workoutProgress.completed}/${workoutProgress.total} series`
  };
}

export function completeCurrentSessionSet(draft = {}, panel = null) {
  if (!panel) return draft;

  const exerciseLog = draft.exerciseLogs?.[panel.exerciseIndex] || {};
  const currentSetLog = exerciseLog[panel.setKey] || {};
  if (!hasValue(currentSetLog.repsDone) || !hasValue(currentSetLog.weightDone)) return draft;

  return {
    ...draft,
    exerciseLogs: {
      ...(draft.exerciseLogs || {}),
      [panel.exerciseIndex]: {
        ...exerciseLog,
        [panel.setKey]: {
          ...currentSetLog,
          completed: true
        }
      }
    }
  };
}

export function updateCurrentSessionSetValue(draft = {}, panel = null, field, value) {
  if (!panel) return draft;

  const exerciseLog = draft.exerciseLogs?.[panel.exerciseIndex] || {};
  const currentSetLog = exerciseLog[panel.setKey] || {};

  return {
    ...draft,
    exerciseLogs: {
      ...(draft.exerciseLogs || {}),
      [panel.exerciseIndex]: {
        ...exerciseLog,
        [panel.setKey]: {
          ...currentSetLog,
          completed: false,
          [field]: value
        }
      }
    }
  };
}

function parseDecimal(value) {
  const normalized = String(value || "").replace(",", ".").match(/-?\d+(\.\d+)?/)?.[0];
  return normalized ? Number(normalized) : 0;
}

function formatDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
}

export function stepCurrentSessionSetValue(draft = {}, panel = null, field, step = 1) {
  if (!panel) return draft;

  const exerciseLog = draft.exerciseLogs?.[panel.exerciseIndex] || {};
  const currentSetLog = exerciseLog[panel.setKey] || {};
  const fallback = field === "weightDone" ? panel.weightPlaceholder : panel.repsPlaceholder;
  const currentValue = currentSetLog[field] || fallback;
  const nextValue = Math.max(0, parseDecimal(currentValue) + step);

  return updateCurrentSessionSetValue(draft, panel, field, formatDecimal(nextValue));
}
