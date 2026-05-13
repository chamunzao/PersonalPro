export function getSessionFlowSections({
  hasWorkout = false,
  hasSessionChanges = false,
  recordStatus = ""
} = {}) {
  const attended = recordStatus === "present";

  return [
    {
      id: "before",
      step: "01",
      title: "Antes da aula",
      description: "Revise aluno, local, financeiro, riscos e treino ativo.",
      state: hasWorkout ? "ready" : "attention"
    },
    {
      id: "during",
      step: "02",
      title: "Durante a aula",
      description: "Acompanhe exercicios, series, repeticoes, carga e ajustes.",
      state: attended ? "active" : "waiting"
    },
    {
      id: "after",
      step: "03",
      title: "Depois da aula",
      description: "Salve notas e gere nova versao do treino quando necessario.",
      state: hasSessionChanges ? "ready" : "waiting"
    }
  ];
}
