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

function getExerciseId(exercise = {}, exerciseIndex = 0) {
  return exercise.executionId || `exercise-${exerciseIndex}`;
}

function isSetCompleted(series = {}, setLog = {}) {
  if (setLog.completed === true) return true;
  if (setLog.completed === false) return false;

  if (series.type === "drop-set" && Array.isArray(series.dropSteps) && series.dropSteps.length) {
    return series.dropSteps.every(step => step.completed);
  }

  return Boolean(series.completed) || hasValue(setLog.repsDone) || hasValue(setLog.weightDone);
}

function isDropSet(series = {}) {
  return series.type === "drop-set" && Array.isArray(series.dropSteps) && series.dropSteps.length > 0;
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

function getGroupLabel(group = {}, groupIndex = 0) {
  if (group.name) return group.name;
  return group.type === "superset" ? `Superserie ${groupIndex + 1}` : `Biset ${groupIndex + 1}`;
}

function getExerciseGroupContext(workout = {}, exerciseId = "") {
  const groupIndex = (workout.groups || []).findIndex(group => group.exerciseIds?.includes(exerciseId));
  if (groupIndex < 0) return { groupLabel: "", groupType: "", groupExercises: [] };

  const group = workout.groups[groupIndex];
  const groupExercises = (group.exerciseIds || [])
    .map(groupExerciseId => (workout.exercises || []).find(exercise => exercise.executionId === groupExerciseId))
    .filter(Boolean)
    .map(exercise => ({
      id: exercise.executionId,
      name: exercise.name || "Exercicio"
    }));

  return {
    groupLabel: getGroupLabel(group, groupIndex),
    groupType: group.type || "biset",
    groupExercises
  };
}

function getGroupForExercise(workout = {}, exerciseId = "") {
  const groupIndex = (workout.groups || []).findIndex(group => group.exerciseIds?.includes(exerciseId));
  if (groupIndex < 0) return null;
  const group = workout.groups[groupIndex];
  const groupExercises = (group.exerciseIds || [])
    .map(groupExerciseId => {
      const exerciseIndex = (workout.exercises || []).findIndex(exercise => exercise.executionId === groupExerciseId);
      return exerciseIndex >= 0
        ? { exercise: workout.exercises[exerciseIndex], exerciseIndex }
        : null;
    })
    .filter(Boolean);
  if (groupExercises.length < 2) return null;
  return { group, groupIndex, groupExercises };
}

function buildGroupRoundEntries({ workout = {}, draft = {}, groupContext, roundIndex = 0 } = {}) {
  return groupContext.groupExercises.map(({ exercise, exerciseIndex }) => {
    const series = getSeries(exercise);
    const set = series[roundIndex] || null;
    const exerciseLog = getExerciseLog(draft, exerciseIndex);
    const setLog = set ? getSetLog(exerciseLog, set, roundIndex) : {};
    const exerciseId = getExerciseId(exercise, exerciseIndex);
    return {
      entryId: exerciseId,
      exerciseIndex,
      exerciseId,
      exerciseName: exercise.name || "Exercicio",
      seriesIndex: roundIndex,
      setKey: set?.id ?? roundIndex,
      noSeries: !set,
      completed: set ? isSetCompleted(set, setLog) : true,
      repsValue: setLog.repsDone || "",
      weightValue: setLog.weightDone || "",
      repsPlaceholder: set?.targetReps || exercise.reps || "10",
      weightPlaceholder: set?.targetWeight || exercise.weight || "Carga",
      restLabel: set?.rest || exercise.rest || ""
    };
  });
}

function isGroupRoundCompleted(workout = {}, draft = {}, groupContext, roundIndex = 0) {
  return buildGroupRoundEntries({ workout, draft, groupContext, roundIndex })
    .every(entry => entry.noSeries || entry.completed);
}

function getGroupRoundProgress(workout = {}, draft = {}, groupContext) {
  const total = Math.max(...groupContext.groupExercises.map(({ exercise }) => getSeries(exercise).length), 0);
  const completed = Array.from({ length: total }).filter((_, roundIndex) => (
    isGroupRoundCompleted(workout, draft, groupContext, roundIndex)
  )).length;
  return { completed, total };
}

function findCurrentSet(workout = {}, draft = {}) {
  for (const [exerciseIndex, exercise] of (workout.exercises || []).entries()) {
    const exerciseId = getExerciseId(exercise, exerciseIndex);
    const groupContext = getGroupForExercise(workout, exerciseId);
    if (groupContext) {
      const firstGroupExerciseId = getExerciseId(groupContext.groupExercises[0].exercise, groupContext.groupExercises[0].exerciseIndex);
      if (firstGroupExerciseId !== exerciseId) continue;
      const progress = getGroupRoundProgress(workout, draft, groupContext);
      const pendingRoundIndex = Array.from({ length: progress.total }).findIndex((_, roundIndex) => (
        !isGroupRoundCompleted(workout, draft, groupContext, roundIndex)
      ));

      if (pendingRoundIndex >= 0) {
        return {
          isGroupRound: true,
          groupContext,
          groupProgress: progress,
          roundIndex: pendingRoundIndex
        };
      }

      continue;
    }

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

  if (current.isGroupRound) {
    const { groupContext, groupProgress, roundIndex } = current;
    const group = groupContext.group;
    const groupSetEntries = buildGroupRoundEntries({ workout, draft, groupContext, roundIndex });
    const editableEntries = groupSetEntries.filter(entry => !entry.noSeries);
    return {
      isGroupSet: true,
      groupId: group.id,
      groupType: group.type || "biset",
      groupLabel: getGroupLabel(group, groupContext.groupIndex),
      exerciseName: groupSetEntries.map(entry => entry.exerciseName).join(" + "),
      groupExercises: groupSetEntries.map(entry => ({
        id: entry.exerciseId,
        name: entry.exerciseName,
        noSeries: entry.noSeries
      })),
      groupSetEntries,
      roundIndex,
      seriesIndex: roundIndex,
      seriesTitle: `Rodada ${roundIndex + 1}/${groupProgress.total}`,
      groupProgressLabel: `${groupProgress.completed}/${groupProgress.total} rodadas concluidas`,
      workoutProgressLabel: `${getWorkoutProgress(workout, draft).completed}/${getWorkoutProgress(workout, draft).total} series`,
      canComplete: editableEntries.length > 0 && editableEntries.every(entry => (
        entry.completed || (hasValue(entry.repsValue) && hasValue(entry.weightValue))
      ))
    };
  }

  const { exerciseIndex, exercise, series, seriesIndex, set, exerciseLog } = current;
  const setLog = getSetLog(exerciseLog, set, seriesIndex);
  const exerciseCompleted = series.filter((item, index) => (
    isSetCompleted(item, getSetLog(exerciseLog, item, index))
  )).length;
  const workoutProgress = getWorkoutProgress(workout, draft);
  const setKey = set?.id ?? seriesIndex;
  const exerciseId = exercise.executionId || `exercise-${exerciseIndex}`;
  const groupContext = getExerciseGroupContext(workout, exerciseId);

  return {
    exerciseIndex,
    exerciseId,
    exerciseName: exercise.name || "Exercicio",
    ...groupContext,
    seriesIndex,
    setKey,
    seriesTitle: `Serie ${seriesIndex + 1}`,
    repsValue: setLog.repsDone || "",
    weightValue: setLog.weightDone || "",
    repsPlaceholder: set?.targetReps || exercise.reps || "10",
    weightPlaceholder: set?.targetWeight || exercise.weight || "Carga",
    isDropSet: isDropSet(set),
    dropSteps: isDropSet(set) ? set.dropSteps.map((step, index) => ({
      id: step.id || index,
      role: step.role || (index === 0 ? "main" : "drop"),
      label: step.label || (index === 0 ? "Serie principal" : `Drop ${index}`),
      weight: step.weight || "",
      reps: step.reps || "",
      completed: Boolean(step.completed)
    })) : [],
    canComplete: isDropSet(set)
      ? set.dropSteps.every(step => step.completed)
      : hasValue(setLog.repsDone) && hasValue(setLog.weightDone),
    restLabel: set?.rest || exercise.rest || "Sem descanso",
    exerciseProgressLabel: `${exerciseCompleted}/${series.length} series`,
    workoutProgressLabel: `${workoutProgress.completed}/${workoutProgress.total} series`
  };
}

export function completeCurrentSessionSet(draft = {}, panel = null) {
  if (!panel) return draft;

  if (panel.isGroupSet) {
    if (!panel.canComplete) return draft;
    const nextExerciseLogs = { ...(draft.exerciseLogs || {}) };

    (panel.groupSetEntries || []).forEach(entry => {
      if (entry.noSeries) return;
      const exerciseLog = nextExerciseLogs[entry.exerciseIndex] || {};
      const currentSetLog = exerciseLog[entry.setKey] || {};
      nextExerciseLogs[entry.exerciseIndex] = {
        ...exerciseLog,
        [entry.setKey]: {
          ...currentSetLog,
          completed: true
        }
      };
    });

    return {
      ...draft,
      exerciseLogs: nextExerciseLogs
    };
  }

  const exerciseLog = draft.exerciseLogs?.[panel.exerciseIndex] || {};
  const currentSetLog = exerciseLog[panel.setKey] || {};
  if (!panel.isDropSet && (!hasValue(currentSetLog.repsDone) || !hasValue(currentSetLog.weightDone))) return draft;
  if (panel.isDropSet && !panel.canComplete) return draft;

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

export function updateCurrentSessionSetValue(draft = {}, panel = null, field, value, options = {}) {
  if (!panel) return draft;

  if (panel.isGroupSet) {
    const entry = (panel.groupSetEntries || []).find(item => item.entryId === options.entryId) || panel.groupSetEntries?.[0];
    if (!entry || entry.noSeries) return draft;
    const exerciseLog = draft.exerciseLogs?.[entry.exerciseIndex] || {};
    const currentSetLog = exerciseLog[entry.setKey] || {};
    return {
      ...draft,
      exerciseLogs: {
        ...(draft.exerciseLogs || {}),
        [entry.exerciseIndex]: {
          ...exerciseLog,
          [entry.setKey]: {
            ...currentSetLog,
            completed: false,
            [field]: value
          }
        }
      }
    };
  }

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

export function stepCurrentSessionSetValue(draft = {}, panel = null, field, step = 1, options = {}) {
  if (!panel) return draft;

  if (panel.isGroupSet) {
    const entry = (panel.groupSetEntries || []).find(item => item.entryId === options.entryId) || panel.groupSetEntries?.[0];
    if (!entry || entry.noSeries) return draft;
    const exerciseLog = draft.exerciseLogs?.[entry.exerciseIndex] || {};
    const currentSetLog = exerciseLog[entry.setKey] || {};
    const fallback = field === "weightDone" ? entry.weightPlaceholder : entry.repsPlaceholder;
    const currentValue = currentSetLog[field] || fallback;
    const nextValue = Math.max(0, parseDecimal(currentValue) + step);
    return updateCurrentSessionSetValue(draft, panel, field, formatDecimal(nextValue), { entryId: entry.entryId });
  }

  const exerciseLog = draft.exerciseLogs?.[panel.exerciseIndex] || {};
  const currentSetLog = exerciseLog[panel.setKey] || {};
  const fallback = field === "weightDone" ? panel.weightPlaceholder : panel.repsPlaceholder;
  const currentValue = currentSetLog[field] || fallback;
  const nextValue = Math.max(0, parseDecimal(currentValue) + step);

  return updateCurrentSessionSetValue(draft, panel, field, formatDecimal(nextValue));
}
