function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function isSetLogCompleted(setLog) {
  if (setLog?.completed === true) return true;
  if (setLog?.completed === false) return false;
  return hasValue(setLog?.repsDone) || hasValue(setLog?.weightDone);
}

function getSeries(exercise = {}) {
  if (Array.isArray(exercise.series) && exercise.series.length) return exercise.series;

  const count = Math.max(parseInt(String(exercise.sets || "").match(/\d+/)?.[0] || "1", 10) || 1, 1);
  return Array.from({ length: count }).map((_, index) => ({
    id: `${exercise.executionId || "exercise"}-set-${index}`,
    sourceSetIndex: index,
    completed: false,
    dropSteps: []
  }));
}

function getExerciseLog(draft = {}, exercise = {}, exerciseIndex) {
  const logs = draft.exerciseLogs || {};
  return logs[exercise.executionId]
    || logs[exercise.sourceExerciseIndex]
    || logs[exerciseIndex]
    || {};
}

function isSeriesCompleted(series = {}, exerciseLog = {}, seriesIndex) {
  const setLogCompleted = isSetLogCompleted(exerciseLog[series.id])
    || isSetLogCompleted(exerciseLog[series.sourceSetIndex])
    || isSetLogCompleted(exerciseLog[seriesIndex]);
  if (setLogCompleted !== false && setLogCompleted) return true;
  if (
    exerciseLog[series.id]?.completed === false
    || exerciseLog[series.sourceSetIndex]?.completed === false
    || exerciseLog[seriesIndex]?.completed === false
  ) return false;

  if (series.type === "drop-set" && Array.isArray(series.dropSteps) && series.dropSteps.length) {
    return series.dropSteps.every(step => step.completed);
  }

  return Boolean(series.completed);
}

export function getSessionWorkoutProgress(workout = {}, draft = {}) {
  const exercises = workout?.exercises || [];

  return exercises.reduce((progress, exercise, exerciseIndex) => {
    const series = getSeries(exercise);
    const exerciseLog = getExerciseLog(draft, exercise, exerciseIndex);
    const completedSeries = series.filter((item, seriesIndex) => isSeriesCompleted(item, exerciseLog, seriesIndex)).length;

    return {
      total: progress.total + series.length,
      completed: progress.completed + completedSeries
    };
  }, { completed: 0, total: 0 });
}

export function getCurrentSessionExercise(workout = {}, draft = {}) {
  return (workout?.exercises || []).find((exercise, exerciseIndex) => {
    const series = getSeries(exercise);
    const exerciseLog = getExerciseLog(draft, exercise, exerciseIndex);
    return series.some((item, seriesIndex) => !isSeriesCompleted(item, exerciseLog, seriesIndex));
  }) || workout?.exercises?.[0] || null;
}

function getStatusLabel({ recordStatus, completed, total, hasWorkout }) {
  if (recordStatus === "absent") return "Falta registrada";
  if (recordStatus === "present" && total === 0) return "Presenca";
  if (!hasWorkout) return "Aguardando treino";
  if (total > 0 && completed >= total) return "Concluido";
  if (completed > 0) return "Registrar";
  return "Aguardando";
}

export function buildSessionClassCenterSummary({
  workout,
  draft = {},
  record = null,
  studentSummary = null
}) {
  const progress = getSessionWorkoutProgress(workout, draft);
  const currentExercise = getCurrentSessionExercise(workout, draft);
  const riskAlerts = (studentSummary?.riskTags || []).slice(0, 2).map(tag => tag.label);
  const financialAlert = studentSummary?.financialSeverity && studentSummary.financialSeverity !== "ok"
    ? studentSummary.financialLabel
    : "";
  const noteAlert = hasValue(studentSummary?.lastSessionNote) ? "Obs. recente" : "";
  const alerts = [financialAlert, ...riskAlerts, noteAlert].filter(Boolean);

  return {
    workoutName: workout?.name || studentSummary?.activeWorkoutName || "Sem treino ativo",
    currentExerciseName: currentExercise?.name || "Sem exercicio atual",
    progressLabel: `${progress.completed}/${progress.total} series`,
    statusLabel: getStatusLabel({
      recordStatus: record?.status || "",
      completed: progress.completed,
      total: progress.total,
      hasWorkout: Boolean(workout)
    }),
    alerts
  };
}
