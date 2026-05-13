import assert from "node:assert/strict";
import {
  buildTemplateMessageForStudent,
  createCustomMessageTemplate,
  filterStudentsForCommunication,
  getStandardMessageTemplates
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

assert.match(
  buildTemplateMessageForStudent({
    template: { body: "Ola, {primeiro_nome}! Valor: {valor}. Proxima: {proxima_aula}." },
    student: students[0],
    context: { amount: 120, nextClassText: "15/05/2026 as 08:00" }
  }),
  /Ola, Ana! Valor: R\$\s?120,00\. Proxima: 15\/05\/2026 as 08:00\./,
  "template rendering replaces student and context placeholders"
);

const custom = createCustomMessageTemplate({
  title: "Retorno avaliacao",
  body: "Ola, {primeiro_nome}! Vamos revisar sua avaliacao?"
});

assert.equal(custom.type, "custom", "custom message templates are tagged separately");
assert.equal(custom.title, "Retorno avaliacao", "custom template keeps personal title");
assert.match(custom.id, /^custom-/, "custom template gets a generated id");

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
