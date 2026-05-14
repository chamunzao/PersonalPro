import { applySessionNotesUpdate } from "../../services/recordsService.js";
import { normalizeSessionCheckout } from "./sessionCheckoutUtils.js";

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
  const executedWorkout = draft.executedWorkout || null;
  const sessionCheckout = normalizeSessionCheckout(draft.sessionCheckout);

  await saveSessionNotesRecord({
    userId,
    classKey,
    sessionNote,
    exerciseNotes,
    exerciseLogs,
    executedWorkout,
    sessionCheckout
  });

  setRecords(prev => applySessionNotesUpdate(prev, {
    classKey,
    sessionNote,
    exerciseNotes,
    exerciseLogs,
    executedWorkout,
    sessionCheckout
  }));
}
