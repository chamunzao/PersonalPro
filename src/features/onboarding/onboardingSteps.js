export function shouldShowOnboarding(students) {
  return students.length === 0;
}

export function getOnboardingSteps() {
  return [
    {
      targetTab: "students",
      title: "Cadastre seu primeiro aluno",
      description: "Nome, WhatsApp, preço da aula e observações iniciais."
    },
    {
      targetTab: "agenda",
      title: "Defina a agenda fixa",
      description: "Escolha dias e horários para o app montar sua rotina."
    },
    {
      targetTab: "payments",
      title: "Configure a cobrança",
      description: "Use por aula, pacote, pacote mensal ou mensalidade."
    },
    {
      targetTab: "session",
      title: "Execute a primeira aula",
      description: "Marque presença, registre carga e salve notas da sessão."
    }
  ];
}
