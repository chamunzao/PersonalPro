import assert from "node:assert/strict";
import test from "node:test";
import { loadAppData } from "../src/services/appDataService.js";

function makeDoc(id, data) {
  return {
    id,
    data: () => data
  };
}

function makeSnap(docs = []) {
  return {
    docs,
    empty: docs.length === 0
  };
}

test("loadAppData keeps students when optional collections fail", async () => {
  const getDocsFn = async (path) => {
    if (path.endsWith("/students")) {
      return makeSnap([makeDoc("student-1", { name: "Ana", schedule: [] })]);
    }
    throw Object.assign(new Error(`Denied ${path}`), { code: "permission-denied" });
  };

  const data = await loadAppData("user-1", "coach@example.com", {
    collectionFn: (_db, path) => path,
    getDocsFn,
    getThemeKeyFn: async () => {
      throw Object.assign(new Error("Denied theme"), { code: "permission-denied" });
    }
  });

  assert.deepEqual(data.students, [{ id: "student-1", name: "Ana", schedule: [] }]);
  assert.deepEqual(data.records, []);
  assert.deepEqual(data.payments, []);
  assert.deepEqual(data.scheduleOverrides, []);
  assert.equal(data.themeKey, null);
});

test("loadAppData surfaces permission errors from the students collection", async () => {
  const error = Object.assign(new Error("Denied students"), { code: "permission-denied" });

  await assert.rejects(
    () => loadAppData("user-1", "coach@example.com", {
      collectionFn: (_db, path) => path,
      getDocsFn: async () => {
        throw error;
      },
      getThemeKeyFn: async () => null
    }),
    error
  );
});
