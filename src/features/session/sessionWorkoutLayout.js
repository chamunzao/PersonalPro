const MAX_VISIBLE_SETS = 8;

const TECHNIQUE_LABELS = {
  "drop-set": "Drop set",
  dropset: "Drop set",
  biset: "Biset",
  warmup: "Aquecimento",
  aquecimento: "Aquecimento",
  superset: "Supersérie",
  supersetie: "Supersérie"
};

export function getCompactSetCount(sets) {
  const parsed = parseInt(String(sets || "").match(/\d+/)?.[0] || "0", 10);
  return Math.min(Math.max(parsed || 1, 1), MAX_VISIBLE_SETS);
}

export function getExerciseTechniqueLabel(exercise = {}) {
  const rawTechnique = String(exercise.technique || exercise.method || "").trim().toLowerCase();
  if (!rawTechnique) return "";
  return TECHNIQUE_LABELS[rawTechnique] || exercise.technique || exercise.method || "";
}

export function buildExercisePrescription(exercise = {}) {
  const parts = [
    `${exercise.sets || "-"} séries x ${exercise.reps || "-"} reps`,
    exercise.weight || "",
    exercise.rest ? `descanso ${exercise.rest}` : ""
  ];
  return parts.filter(Boolean).join(" · ");
}

export function countCompactCompletedSets(exerciseLog) {
  return Object.values(exerciseLog || {}).filter(setLog => (
    setLog?.completed === true
    || (
      setLog?.completed !== false
      && (String(setLog?.repsDone || "").trim() || String(setLog?.weightDone || "").trim())
    )
  )).length;
}

export function buildSessionWorkoutRows({ exercises = [], draft = {} } = {}) {
  return exercises.map((exercise, index) => {
    const totalSets = getCompactSetCount(exercise.sets);
    const completedSets = countCompactCompletedSets(draft.exerciseLogs?.[index]);
    const metaLabel = [exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" / ");

    return {
      index,
      exercise,
      letter: String(exercise.name || "?").trim().charAt(0).toUpperCase() || "?",
      prescription: buildExercisePrescription(exercise),
      progressLabel: `${completedSets}/${totalSets} séries feitas`,
      metaLabel,
      techniqueLabel: getExerciseTechniqueLabel(exercise),
      groupLabel: exercise.groupName || exercise.group || ""
    };
  });
}

export function buildSessionSetRows({ exercise = {}, exerciseLog = {}, adjustment = {} } = {}) {
  return buildSessionSetRowsWithAdjustment({ exercise, exerciseLog, adjustment });
}

export function buildSessionSetRowsWithAdjustment({ exercise = {}, exerciseLog = {}, adjustment = {} } = {}) {
  if (Array.isArray(exercise.series) && exercise.series.length) {
    return exercise.series.map((series, index) => {
      const setLog = exerciseLog?.[series.id] || exerciseLog?.[series.sourceSetIndex] || exerciseLog?.[index] || {};
      const technique = series.type || "";
      return {
        index: series.id,
        title: `Série ${index + 1}`,
        typeLabel: getExerciseTechniqueLabel({ technique }) || "Normal",
        targetLabel: series.targetReps ? `${series.targetReps} reps` : "",
        repsValue: setLog.repsDone || "",
        weightValue: setLog.weightDone || "",
        repsPlaceholder: series.targetReps || exercise.reps || "10",
        weightPlaceholder: series.targetWeight || exercise.weight || "Carga",
        dropSteps: series.dropSteps || [],
        note: series.notes || ""
      };
    });
  }

  const baseSetCount = getCompactSetCount(exercise.sets);
  const duplicatedSets = adjustment.duplicatedSets || buildLegacyDuplicatedSets(adjustment.extraSets);
  const rowConfigs = Array.from({ length: baseSetCount }).map((_, index) => ({
    setIndex: index,
    sourceIndex: index,
    technique: adjustment.setTechniques?.[index] || exercise.technique
  }));

  duplicatedSets.forEach((duplicatedSet, duplicateIndex) => {
    const sourceIndex = normalizeSetIndex(duplicatedSet.sourceIndex ?? duplicatedSet.afterIndex);
    const setIndex = duplicatedSet.id || `extra-${normalizeSetIndex(duplicatedSet.afterIndex)}-${duplicateIndex}`;
    const afterIndex = normalizeSetIndex(duplicatedSet.afterIndex);
    const insertAfterIndex = rowConfigs.findIndex(rowConfig => normalizeSetIndex(rowConfig.setIndex) === afterIndex);
    const nextRow = {
      setIndex,
      sourceIndex,
      technique: adjustment.setTechniques?.[setIndex] || duplicatedSet.technique || adjustment.setTechniques?.[sourceIndex] || exercise.technique
    };

    rowConfigs.splice(insertAfterIndex >= 0 ? insertAfterIndex + 1 : rowConfigs.length, 0, nextRow);
  });

  return rowConfigs.map((rowConfig, displayIndex) => (
    buildSessionSetRow({
      exercise,
      exerciseLog,
      ...rowConfig,
      displayIndex
    })
  ));
}

function buildSessionSetRow({ exercise, exerciseLog, setIndex, sourceIndex = setIndex, displayIndex, technique }) {
  const adjustedExercise = {
    ...exercise,
    technique
  };
  const setLog = exerciseLog?.[setIndex] || exerciseLog?.[sourceIndex] || {};

  return {
    index: setIndex,
    title: `Série ${displayIndex + 1}`,
    typeLabel: getExerciseTechniqueLabel(adjustedExercise) || "Normal",
    targetLabel: adjustedExercise.reps ? `${adjustedExercise.reps} reps` : "",
    repsValue: setLog.repsDone || "",
    weightValue: setLog.weightDone || "",
    repsPlaceholder: adjustedExercise.reps || "10",
    weightPlaceholder: adjustedExercise.weight || "Carga"
  };
}

function buildLegacyDuplicatedSets(extraSets = 0) {
  return Array.from({ length: Number(extraSets || 0) }).map((_, index) => ({
    afterIndex: 0,
    sourceIndex: 0,
    legacyIndex: index
  }));
}

export function applySessionSetAction(adjustment = {}, actionId, setIndex = 0) {
  const normalizedSetIndex = normalizeSetIndex(setIndex);

  if (actionId === "drop-set") {
    return applySetTechnique(adjustment, normalizedSetIndex, "drop-set");
  }

  if (actionId === "biset") {
    return applySetTechnique(adjustment, normalizedSetIndex, "biset");
  }

  if (actionId === "duplicate-set") {
    const duplicatedSets = adjustment.duplicatedSets || buildLegacyDuplicatedSets(adjustment.extraSets);
    return {
      ...adjustment,
      extraSets: Number(adjustment.extraSets || 0) + 1,
      duplicatedSets: [
        ...duplicatedSets,
        {
          id: `extra-${normalizedSetIndex}-${duplicatedSets.length}`,
          afterIndex: normalizedSetIndex,
          sourceIndex: normalizedSetIndex,
          technique: adjustment.setTechniques?.[normalizedSetIndex] || adjustment.technique
        }
      ]
    };
  }

  if (actionId === "remove-set") {
    const duplicatedSets = adjustment.duplicatedSets || buildLegacyDuplicatedSets(adjustment.extraSets);
    return {
      ...adjustment,
      extraSets: Math.max(0, Number(adjustment.extraSets || 0) - 1),
      duplicatedSets: duplicatedSets.slice(0, -1)
    };
  }

  return adjustment;
}

function applySetTechnique(adjustment, setIndex, technique) {
  return {
    ...adjustment,
    setTechniques: {
      ...(adjustment.setTechniques || {}),
      [setIndex]: technique
    }
  };
}

function normalizeSetIndex(setIndex) {
  if (typeof setIndex === "string") return setIndex;
  return Number.parseInt(setIndex, 10) || 0;
}
