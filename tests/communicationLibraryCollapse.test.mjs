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
  /const \[isTemplateSearchFocused, setIsTemplateSearchFocused\] = useState\(false\)/,
  "message search focus should be tracked"
);

assert.match(
  communicationTab,
  /isTemplateLibraryExpanded \|\| isTemplateSearchFocused \|\| templateSearch\.trim\(\)/,
  "message list should appear when expanded, searching, or focused"
);

assert.match(
  communicationTab,
  /onFocus=\{\(\) => setIsTemplateSearchFocused\(true\)\}/,
  "message search should expand the list on focus"
);
