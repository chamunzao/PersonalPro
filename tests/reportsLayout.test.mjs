import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync("src/styles.css", "utf8");

function getRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));
  return match?.[1] || "";
}

assert.match(
  getRule(".reports-decision-summary"),
  /grid-template-columns:\s*1fr/,
  "decision summary should stack metrics in one vertical list"
);

assert.match(
  getRule(".reports-decision-grid"),
  /grid-template-columns:\s*1fr/,
  "decision cards should stack one below the other"
);
