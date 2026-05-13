const primaryNavigation = [
  { id: "dashboard", label: "Início" },
  { id: "session", label: "Aula" },
  { id: "agenda", label: "Agenda" },
  { id: "students", label: "Alunos" },
  { id: "more", label: "Mais" }
];

const moreNavigation = [
  { id: "payments", label: "Pagamentos", description: "Recebidos, pendências e pacotes" },
  { id: "alerts", label: "Pendências", description: "Cobranças, faltas e ações para resolver" },
  { id: "communication", label: "Contato", description: "Mensagens prontas para WhatsApp" },
  { id: "workoutModels", label: "Biblioteca de Treinos", description: "Treinos prontos para aplicar em alunos" },
  { id: "reports", label: "Relatório", description: "Receita, taxas e presença" },
  { id: "settings", label: "Ajustes", description: "Tema e preferências do app" }
];

const moreNavigationIds = new Set(moreNavigation.map(item => item.id));

export function getPrimaryNavigation() {
  return primaryNavigation;
}

export function getMoreNavigation() {
  return moreNavigation;
}

export function isMoreSectionActive(activeTab) {
  return activeTab === "more" || moreNavigationIds.has(activeTab);
}
