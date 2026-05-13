import assert from "node:assert/strict";
import {
  buildTemplateMessageForStudent,
  createCustomMessageTemplate,
  filterStudentsForCommunication,
  getStandardMessageTemplates,
  updateCustomMessageTemplate
} from "../src/features/communication/messageTemplates.js";

const students = [
  { id: "ana", name: "Ana Beatriz", phone: "11999990000" },
  { id: "bruno", name: "Bruno Lima", phone: "" },
  { id: "carla", name: "Carla Souza", phone: "11988880000" }
];

const standardTemplates = getStandardMessageTemplates();

assert.ok(
  standardTemplates.some(template => template.id === "paymentReminder" && template.title === "Cobrar pagamento"),
  "standard template list exposes named reusable messages"
);

assert.ok(
  standardTemplates.some(template => template.id === "weeklyConfirmation" && template.description === "Envia horários fixos da semana"),
  "standard templates should use correct Portuguese accents"
);

assert.match(
  buildTemplateMessageForStudent({
    template: { body: "Olá, {primeiro_nome}! Valor: {valor}. Próxima: {proxima_aula}." },
    student: students[0],
    context: { amount: 120, nextClassText: "15/05/2026 às 08:00" }
  }),
  /Olá, Ana! Valor: R\$\s?120,00\. Próxima: 15\/05\/2026 às 08:00\./,
  "template rendering replaces student and context placeholders"
);

const custom = createCustomMessageTemplate({
  title: "Retorno avaliação",
  body: "Olá, {primeiro_nome}! Vamos revisar sua avaliação?"
});

assert.equal(custom.type, "custom", "custom message templates are tagged separately");
assert.equal(custom.title, "Retorno avaliação", "custom template keeps personal title");
assert.match(custom.id, /^custom-/, "custom template gets a generated id");

const edited = updateCustomMessageTemplate(custom, {
  title: "Retorno pós-avaliação",
  body: "Olá, {primeiro_nome}! Sua avaliação foi atualizada."
});

assert.equal(edited.id, custom.id, "editing a custom template keeps the same id");
assert.equal(edited.title, "Retorno pós-avaliação", "editing updates the template title");
assert.equal(edited.body, "Olá, {primeiro_nome}! Sua avaliação foi atualizada.", "editing updates the template body");

assert.deepEqual(
  filterStudentsForCommunication(students, "bru").map(student => student.id),
  ["bruno"],
  "student search filters by partial name"
);

assert.deepEqual(
  filterStudentsForCommunication(students, "").map(student => student.id),
  ["ana", "bruno", "carla"],
  "empty search keeps all students ordered by name"
);
