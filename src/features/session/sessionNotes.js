import { applySessionNotesUpdate } from "../../services/recordsService.js";

export async function persistSessionNotesDraft({
  userId,
  classKey,
  draft = {},
  saveSessionNotesRecord,
  setRecords
}) {
  const sessionNote = draft.sessionNote || "";
  const exerciseNotes = draft.exerciseNotes || {};
  const exerciseLogs = draft.exerciseLogs || {};

  await saveSessionNotesRecord({
    userId,
    classKey,
    sessionNote,
    exerciseNotes,
    exerciseLogs
  });

  setRecords(prev => applySessionNotesUpdate(prev, {
    classKey,
    sessionNote,
    exerciseNotes,
    exerciseLogs
  }));
}
