import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const communicationTab = readFileSync("src/features/communication/CommunicationTab.jsx", "utf8");

assert.match(
  communicationTab,
  /const \[isTemplateLibraryExpanded, setIsTemplateLibraryExpanded\] = useState\(false\)/,
  "message library should start collapsed"
);

assert.match(
  communicationTab,
  /placeholder="Pesquisar mensagem padrão"/,
  "message library should allow searching before expanding"
);

assert.match(
  communicationTab,
  /isTemplateLibraryExpanded \|\| templateSearch\.trim\(\)/,
  "message list should appear when expanded or when searching"
);
