import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const communicationTab = readFileSync("src/features/communication/CommunicationTab.jsx", "utf8");

assert.match(
  communicationTab,
  /Use \{'\{primeiro_nome\}'\} para trocar automaticamente pelo primeiro nome do aluno selecionado\./,
  "custom message form should explain automatic first-name replacement"
);

assert.match(
  communicationTab,
  /\{'\{nome\}'\} usa o nome completo\./,
  "custom message form should explain full-name replacement"
);

assert.match(
  communicationTab,
  /\{'\{valor\}'\} insere o valor previsto do plano ou aula\./,
  "custom message form should explain automatic amount replacement"
);

assert.match(
  communicationTab,
  /\{'\{proxima_aula\}'\} mostra a próxima aula quando houver agenda\./,
  "custom message form should explain next-class replacement"
);

assert.match(
  communicationTab,
  /\{'\{saldo_pacote\}'\} mostra o saldo de aulas quando disponível\./,
  "custom message form should explain package-balance replacement"
);
