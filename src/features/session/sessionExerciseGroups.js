export function getExerciseGroupLabel(group = {}, index = 0) {
  if (group.name) return group.name;
  return group.type === "superset" ? `Superserie ${index + 1}` : `Biset ${index + 1}`;
}

export function getExerciseGroupCandidateIds(exercises = [], startIndex = 0, count = 2) {
  const candidates = exercises.slice(startIndex, startIndex + count);
  if (candidates.length < count) return [];
  return candidates.map((exercise, index) => exercise.executionId || `exercise-${startIndex + index}`);
}

export function buildSessionExerciseGroupBlocks({ exercises = [], groups = [] } = {}) {
  const exerciseById = new Map(exercises.map((exercise, index) => [
    exercise.executionId || `exercise-${index}`,
    { exercise, index }
  ]));
  const groupedIds = new Set();
  const validGroups = groups
    .map((group, groupIndex) => ({
      ...group,
      groupIndex,
      exercises: (group.exerciseIds || [])
        .map(exerciseId => exerciseById.get(exerciseId))
        .filter(Boolean)
    }))
    .filter(group => group.exercises.length >= 2);

  const blocks = [];

  exercises.forEach((exercise, index) => {
    const exerciseId = exercise.executionId || `exercise-${index}`;
    if (groupedIds.has(exerciseId)) return;

    const group = validGroups.find(item => item.exerciseIds?.includes(exerciseId));
    if (group) {
      group.exercises.forEach(item => groupedIds.add(item.exercise.executionId || `exercise-${item.index}`));
      blocks.push({
        type: "group",
        id: group.id,
        groupType: group.type || "biset",
        label: getExerciseGroupLabel(group, group.groupIndex),
        exerciseIds: [...(group.exerciseIds || [])],
        exercises: group.exercises.map(item => item.exercise),
        indexes: group.exercises.map(item => item.index)
      });
      return;
    }

    blocks.push({
      type: "exercise",
      id: exerciseId,
      exercise,
      index
    });
  });

  return blocks;
}
