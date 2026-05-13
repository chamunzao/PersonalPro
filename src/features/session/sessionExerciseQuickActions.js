export const EXERCISE_QUICK_ACTIONS = [
  {
    id: "loadUp",
    label: "Subiu carga",
    note: "Aumentou carga nesta aula."
  },
  {
    id: "maintained",
    label: "Manteve",
    note: "Manteve carga/repeticoes."
  },
  {
    id: "pain",
    label: "Sentiu dor",
    note: "Relatou dor/desconforto. Revisar exercicio."
  },
  {
    id: "replace",
    label: "Trocar",
    note: "Avaliar substituicao deste exercicio."
  }
];

export function appendExerciseQuickAction(currentNote, actionId) {
  const action = EXERCISE_QUICK_ACTIONS.find(item => item.id === actionId);
  if (!action) return currentNote || "";

  const note = String(currentNote || "").trim();
  if (!note) return action.note;
  if (note.includes(action.note)) return note;
  return `${note}\n${action.note}`;
}
