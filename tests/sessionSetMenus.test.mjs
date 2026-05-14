import assert from "node:assert/strict";
import test from "node:test";
import {
  hasOpenSetActionMenu,
  isSetMenuInteractionTarget
} from "../src/features/session/sessionSetMenus.js";

function fakeTarget(matches) {
  return {
    closest(selector) {
      return matches.includes(selector) ? {} : null;
    }
  };
}

test("set action menus detect open entries", () => {
  assert.equal(hasOpenSetActionMenu({ "student-1-set-1": false }), false);
  assert.equal(hasOpenSetActionMenu({ "student-1-set-1": true }), true);
});

test("set action menu outside click helper keeps menu interactions open", () => {
  assert.equal(isSetMenuInteractionTarget(fakeTarget([".session-set-menu"])), true);
  assert.equal(isSetMenuInteractionTarget(fakeTarget([".session-set-menu-button"])), true);
  assert.equal(isSetMenuInteractionTarget(fakeTarget([])), false);
  assert.equal(isSetMenuInteractionTarget(null), false);
});
