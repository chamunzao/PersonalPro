export async function loadSessionWorkoutEntries({ studentsToLoad, fetchWorkoutPlans, getDemoWorkoutPlans, isDemoAccount }) {
  const results = await Promise.all(studentsToLoad.map(async cls => {
    try {
      const plans = await fetchWorkoutPlans(cls.studentId);
      return {
        studentId: cls.studentId,
        plans,
        error: null
      };
    } catch (error) {
      if (isDemoAccount) {
        return {
          studentId: cls.studentId,
          plans: getDemoWorkoutPlans(cls.studentId),
          error: null
        };
      }

      return {
        studentId: cls.studentId,
        plans: [],
        error
      };
    }
  }));

  return {
    workoutsByStudent: Object.fromEntries(results.map(result => [result.studentId, result.plans])),
    errorsByStudent: Object.fromEntries(
      results
        .filter(result => result.error)
        .map(result => [result.studentId, result.error])
    )
  };
}
