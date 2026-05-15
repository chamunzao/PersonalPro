function cleanText(value) {
  return String(value || "").trim();
}

function normalize(value) {
  return cleanText(value).toLowerCase();
}

export function buildExercisePickerFilters(library = []) {
  return {
    muscleGroups: [...new Set(library.map(item => cleanText(item.muscleGroup)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    equipment: [...new Set(library.map(item => cleanText(item.equipment)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  };
}

export function filterExercisePickerLibrary(library = [], filters = {}) {
  const search = normalize(filters.search);
  const muscleGroup = normalize(filters.muscleGroup);
  const equipment = normalize(filters.equipment);

  return library.filter(exercise => {
    const haystack = normalize([
      exercise.name,
      exercise.muscleGroup,
      exercise.equipment
    ].filter(Boolean).join(" "));
    const matchesSearch = !search || haystack.includes(search);
    const matchesMuscle = !muscleGroup || normalize(exercise.muscleGroup) === muscleGroup;
    const matchesEquipment = !equipment || normalize(exercise.equipment) === equipment;
    return matchesSearch && matchesMuscle && matchesEquipment;
  });
}

export function toggleExercisePickerSelection(selectedNames = [], exerciseName = "") {
  if (!exerciseName) return selectedNames;
  return selectedNames.includes(exerciseName)
    ? selectedNames.filter(name => name !== exerciseName)
    : [...selectedNames, exerciseName];
}
