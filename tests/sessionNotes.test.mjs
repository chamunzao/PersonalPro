import assert from "node:assert/strict";
import { persistSessionNotesDraft } from "../src/features/session/sessionNotes.js";

const classKey = "13/05/2026_student-1_08:00";
const draft = {
  sessionNote: "Aluno relatou desconforto leve no ombro.",
  exerciseNotes: { 0: "Reduzir carga no desenvolvimento." },
  exerciseLogs: { 0: { 0: { repsDone: "10", weightDone: "12kg" } } }
};

let savedPayload = null;
let updatedRecords = null;

await persistSessionNotesDraft({
  userId: "trainer-1",
  classKey,
  draft,
  saveSessionNotesRecord: async (payload) => {
    savedPayload = payload;
  },
  setRecords: (updater) => {
    updatedRecords = updater([]);
  }
});

assert.equal(savedPayload.userId, "trainer-1", "notes should be saved for the current user");
assert.equal(savedPayload.classKey, classKey, "notes should preserve the class key");
assert.equal(updatedRecords[0].sessionNote, draft.sessionNote, "local records should reflect saved notes");
assert.deepEqual(updatedRecords[0].exerciseLogs, draft.exerciseLogs, "local records should keep exercise logs");

let setRecordsCalledAfterFailure = false;

await assert.rejects(
  persistSessionNotesDraft({
    userId: "trainer-1",
    classKey,
    draft,
    saveSessionNotesRecord: async () => {
      throw new Error("firestore unavailable");
    },
    setRecords: () => {
      setRecordsCalledAfterFailure = true;
    }
  }),
  /firestore unavailable/,
  "note persistence should reject when remote saving fails"
);

assert.equal(
  setRecordsCalledAfterFailure,
  false,
  "local records should not be updated when remote note saving fails"
);
