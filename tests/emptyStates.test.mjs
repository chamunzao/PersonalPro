import assert from "node:assert/strict";
import { getPaymentsEmptyState, getStudentsEmptyState } from "../src/features/emptyStates/setupEmptyStates.js";

assert.deepEqual(
  getStudentsEmptyState({ hasStudents: false, hasSearch: false }),
  {
    title: "Cadastre seu primeiro aluno",
    description: "Comece com nome, WhatsApp e modelo de cobrança para liberar agenda, aulas e pagamentos.",
    actionLabel: "Novo aluno"
  },
  "empty student portfolio should invite the first registration"
);

assert.deepEqual(
  getStudentsEmptyState({ hasStudents: true, hasSearch: true }),
  {
    title: "Nenhum aluno encontrado",
    description: "Tente buscar por outro nome, telefone ou e-mail.",
    actionLabel: null
  },
  "student search without results should keep search guidance"
);

assert.equal(
  getPaymentsEmptyState(false).title,
  "Pagamentos começam pelos alunos",
  "payment empty state should explain the dependency on students"
);

assert.equal(
  getPaymentsEmptyState(true).title,
  "Nenhuma cobrança neste filtro",
  "payment filter empty state should not ask for a new student"
);
