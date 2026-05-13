import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const communicationTab = readFileSync("src/features/communication/CommunicationTab.jsx", "utf8");

assert.match(
  communicationTab,
  /const \[isStudentListExpanded, setIsStudentListExpanded\] = useState\(false\)/,
  "student list should start collapsed"
);

assert.match(
  communicationTab,
  /const \[isStudentSearchFocused, setIsStudentSearchFocused\] = useState\(false\)/,
  "student search focus should be tracked"
);

assert.match(
  communicationTab,
  /const shouldShowStudentList = isStudentListExpanded \|\| isStudentSearchFocused \|\| studentSearch\.trim\(\)/,
  "student list should appear when expanded, focused, or searching"
);

assert.match(
  communicationTab,
  /function selectStudent\(studentId\)/,
  "student selection should be centralized"
);

assert.match(
  communicationTab,
  /setIsStudentListExpanded\(false\)/,
  "selecting a student should collapse the student list"
);

assert.match(
  communicationTab,
  /setStudentSearch\(''\)/,
  "selecting a student should clear the search so only the selected student remains visible"
);

assert.match(
  communicationTab,
  /Aluno selecionado:/,
  "collapsed student area should show the selected student summary"
);
