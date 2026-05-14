function clone(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function getSetCount(sets) {
  const parsed = parseInt(String(sets || "").match(/\d+/)?.[0] || "0", 10);
  return Math.max(parsed || 1, 1);
}

function createSeriesFromExercise(exercise = {}, exerciseId) {
  return Array.from({ length: getSetCount(exercise.sets) }).map((_, index) => ({
    id: `${exerciseId}-set-${index}`,
    type: "normal",
    sourceSetIndex: index,
    targetReps: exercise.reps || "",
    targetWeight: exercise.weight || "",
    rest: exercise.rest || "",
    notes: "",
    completed: false,
    dropSteps: []
  }));
}

function normalizeExecutedExercise(exercise = {}, index, options = {}) {
  const executionId = options.executionId || exercise.executionId || `exercise-${index}`;
  return {
    executionId,
    sourceExerciseIndex: exercise.sourceExerciseIndex ?? index,
    addedDuringSession: Boolean(options.addedDuringSession ?? exercise.addedDuringSession),
    name: exercise.name || "",
    sets: exercise.sets || "1",
    reps: exercise.reps || "",
    weight: exercise.weight || "",
    rest: exercise.rest || "",
    notes: exercise.notes || "",
    muscleGroup: exercise.muscleGroup || "",
    equipment: exercise.equipment || "",
    instructions: exercise.instructions || "",
    technique: exercise.technique || "",
    groupName: exercise.groupName || "",
    series: Array.isArray(exercise.series) && exercise.series.length
      ? clone(exercise.series)
      : createSeriesFromExercise(exercise, executionId)
  };
}

export function createExecutedWorkoutFromPlan(workoutPlan = {}) {
  return {
    id: `executed-${workoutPlan.id || "workout"}`,
    sourceWorkoutId: workoutPlan.id || null,
    sourceWorkoutName: workoutPlan.name || "",
    name: workoutPlan.name || "Treino executado",
    createdFromPlanAt: new Date().toISOString(),
    plannedSnapshot: clone(workoutPlan),
    exercises: (workoutPlan.exercises || []).map((exercise, index) => normalizeExecutedExercise(exercise, index)),
    groups: [],
    changes: []
  };
}

export function ensureExecutedWorkout(currentExecutedWorkout, workoutPlan = {}) {
  if (currentExecutedWorkout?.exercises) return clone(currentExecutedWorkout);
  return createExecutedWorkoutFromPlan(workoutPlan);
}

function mapExercises(executedWorkout, mapper) {
  return {
    ...executedWorkout,
    exercises: executedWorkout.exercises.map(mapper)
  };
}

function appendChange(executedWorkout, change) {
  return {
    ...executedWorkout,
    changes: [
      ...(executedWorkout.changes || []),
      {
        ...change,
        at: new Date().toISOString()
      }
    ]
  };
}

function findExerciseIndex(executedWorkout, exerciseId) {
  return executedWorkout.exercises.findIndex(exercise => exercise.executionId === exerciseId);
}

export function addExecutedSet(executedWorkout, exerciseId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    const previousSeries = exercise.series[exercise.series.length - 1] || {};
    const nextIndex = exercise.series.length;
    return {
      ...exercise,
      sets: String(nextIndex + 1),
      series: [
        ...exercise.series,
        {
          id: `${exercise.executionId}-set-${nextIndex}`,
          type: "normal",
          sourceSetIndex: null,
          targetReps: previousSeries.targetReps || exercise.reps || "",
          targetWeight: previousSeries.targetWeight || exercise.weight || "",
          rest: previousSeries.rest || exercise.rest || "",
          notes: "",
          completed: false,
          dropSteps: []
        }
      ]
    };
  });

  return appendChange(nextWorkout, { type: "add-set", exerciseId });
}

function createSeriesCopy(series = {}, copyIndex = 0) {
  return {
    ...clone(series),
    id: `${series.id || "series"}-copy-${copyIndex}`,
    sourceSetIndex: null,
    completed: false,
    dropSteps: (series.dropSteps || []).map((step, index) => ({
      ...step,
      id: `${series.id || "series"}-copy-${copyIndex}-drop-${index}`,
      completed: false
    }))
  };
}

function createDropStep(series = {}, stepIndex = 0, previousStep = {}) {
  const isMainStep = stepIndex === 0;
  return {
    id: isMainStep ? `${series.id}-drop-main` : `${series.id}-drop-${stepIndex}`,
    role: isMainStep ? "main" : "drop",
    label: isMainStep ? "Serie principal" : `Drop ${stepIndex}`,
    weight: previousStep.weight || series.targetWeight || "",
    reps: previousStep.reps || series.targetReps || "",
    completed: false
  };
}

function normalizeDropSteps(series = {}) {
  if (Array.isArray(series.dropSteps) && series.dropSteps.length) {
    return series.dropSteps.map((step, index) => ({
      ...step,
      id: step.id || (index === 0 ? `${series.id}-drop-main` : `${series.id}-drop-${index}`),
      role: step.role || (index === 0 ? "main" : "drop"),
      label: step.label || (index === 0 ? "Serie principal" : `Drop ${index}`),
      completed: Boolean(step.completed)
    }));
  }

  return Array.from({ length: 4 }).map((_, index) => createDropStep(series, index));
}

export function duplicateExecutedSet(executedWorkout, exerciseId, seriesId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    const sourceIndex = exercise.series.findIndex(series => series.id === seriesId);
    if (sourceIndex < 0) return exercise;
    const sourceSeries = exercise.series[sourceIndex];
    const existingCopies = exercise.series.filter(series => String(series.id || "").startsWith(`${seriesId}-copy-`)).length;
    const nextSeries = [...exercise.series];
    nextSeries.splice(sourceIndex + 1, 0, createSeriesCopy(sourceSeries, existingCopies));
    return {
      ...exercise,
      sets: String(nextSeries.length),
      series: nextSeries
    };
  });

  return appendChange(nextWorkout, { type: "duplicate-set", exerciseId, seriesId });
}

export function removeExecutedSet(executedWorkout, exerciseId, seriesId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    const nextSeries = exercise.series.filter(series => series.id !== seriesId);
    return {
      ...exercise,
      sets: String(Math.max(nextSeries.length, 1)),
      series: nextSeries.length ? nextSeries : exercise.series
    };
  });

  return appendChange(nextWorkout, { type: "remove-set", exerciseId, seriesId });
}

export function updateExecutedSetMeta(executedWorkout, exerciseId, seriesId, patch = {}) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => (
        series.id === seriesId ? { ...series, ...patch } : series
      ))
    };
  });

  return appendChange(nextWorkout, { type: "update-set-meta", exerciseId, seriesId, patch });
}

export function transformSetToDropSet(executedWorkout, exerciseId, seriesId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => {
        if (series.id !== seriesId) return series;
        return {
          ...series,
          type: "drop-set",
          dropSteps: normalizeDropSteps(series)
        };
      })
    };
  });

  return appendChange(nextWorkout, { type: "drop-set", exerciseId, seriesId });
}

export function addDropSetStep(executedWorkout, exerciseId, seriesId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => {
        if (series.id !== seriesId) return series;
        const existingSteps = normalizeDropSteps(series);
        const previousStep = existingSteps[existingSteps.length - 1] || {};
        return {
          ...series,
          type: "drop-set",
          dropSteps: [
            ...existingSteps,
            createDropStep(series, existingSteps.length, previousStep)
          ]
        };
      })
    };
  });

  return appendChange(nextWorkout, { type: "add-drop-step", exerciseId, seriesId });
}

export function updateDropSetStep(executedWorkout, exerciseId, seriesId, stepId, patch = {}) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => {
        if (series.id !== seriesId) return series;
        return {
          ...series,
          dropSteps: (series.dropSteps || []).map(step => (
            step.id === stepId ? { ...step, ...patch } : step
          ))
        };
      })
    };
  });

  return appendChange(nextWorkout, { type: "update-drop-step", exerciseId, seriesId, stepId });
}

export function removeDropSetStep(executedWorkout, exerciseId, seriesId, stepId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => {
        if (series.id !== seriesId) return series;
        const nextDropSteps = normalizeDropSteps(series).filter(step => step.id !== stepId);
        return {
          ...series,
          dropSteps: nextDropSteps.length ? nextDropSteps : normalizeDropSteps(series)
        };
      })
    };
  });

  return appendChange(nextWorkout, { type: "remove-drop-step", exerciseId, seriesId, stepId });
}

export function undoDropSet(executedWorkout, exerciseId, seriesId) {
  const nextWorkout = mapExercises(executedWorkout, exercise => {
    if (exercise.executionId !== exerciseId) return exercise;
    return {
      ...exercise,
      series: exercise.series.map(series => {
        if (series.id !== seriesId) return series;
        const dropStepsArchive = normalizeDropSteps(series);
        const mainStep = dropStepsArchive[0] || {};
        return {
          ...series,
          type: "normal",
          targetWeight: mainStep.weight || series.targetWeight || "",
          targetReps: mainStep.reps || series.targetReps || "",
          completed: Boolean(mainStep.completed && dropStepsArchive.every(step => step.completed)),
          dropSteps: [],
          dropStepsArchive
        };
      })
    };
  });

  return appendChange(nextWorkout, { type: "undo-drop-set", exerciseId, seriesId });
}

export function addExecutedExercise(executedWorkout, exercise = {}, options = {}) {
  const nextId = `exercise-${Date.now()}-${(executedWorkout.exercises || []).length}`;
  const nextExercise = normalizeExecutedExercise(
    exercise,
    executedWorkout.exercises.length,
    { executionId: nextId, addedDuringSession: true }
  );
  const afterIndex = options.afterExerciseId ? findExerciseIndex(executedWorkout, options.afterExerciseId) : -1;
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : executedWorkout.exercises.length;
  const nextExercises = [...executedWorkout.exercises];
  nextExercises.splice(insertIndex, 0, nextExercise);

  return appendChange({
    ...executedWorkout,
    exercises: nextExercises
  }, { type: "add-exercise", exerciseId: nextExercise.executionId, insertIndex });
}

export function createBisetGroup(executedWorkout, exerciseIds = []) {
  const groupId = `biset-${Date.now()}-${(executedWorkout.groups || []).length}`;
  const nextWorkout = {
    ...executedWorkout,
    groups: [
      ...(executedWorkout.groups || []),
      {
        id: groupId,
        type: "biset",
        exerciseIds: [...exerciseIds]
      }
    ]
  };

  return appendChange(nextWorkout, { type: "create-biset", groupId, exerciseIds });
}

export function removeBisetGroup(executedWorkout, groupId) {
  const nextWorkout = {
    ...executedWorkout,
    groups: (executedWorkout.groups || []).filter(group => group.id !== groupId)
  };

  return appendChange(nextWorkout, { type: "remove-biset", groupId });
}
