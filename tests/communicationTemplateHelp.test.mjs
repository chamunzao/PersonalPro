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
