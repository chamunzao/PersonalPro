export function getStudentsEmptyState({ hasStudents, hasSearch }) {
  if (hasStudents && hasSearch) {
    return {
      title: "Nenhum aluno encontrado",
      description: "Tente buscar por outro nome, telefone ou e-mail.",
      actionLabel: null
    };
  }

  return {
    title: "Cadastre seu primeiro aluno",
    description: "Comece com nome, WhatsApp e modelo de cobrança para liberar agenda, aulas e pagamentos.",
    actionLabel: "Novo aluno"
  };
}

export function getPaymentsEmptyState(hasStudents) {
  if (hasStudents) {
    return {
      title: "Nenhuma cobrança neste filtro",
      description: "Troque o filtro ou revise o mês selecionado."
    };
  }

  return {
    title: "Pagamentos começam pelos alunos",
    description: "Cadastre um aluno para o app montar a lista de cobranças do mês."
  };
}
