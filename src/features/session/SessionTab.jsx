import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc
} from '../../firebase';
import { formatDate, formatDateISO } from '../../lib/dates';
import {
  calculateAdvanceCreditStatus,
  calculateBillingStatus,
  getAdvanceCreditStatusColors,
  getAdvanceCreditStatusLabel,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';
import { getClassesForDate } from '../schedule/scheduleCalculations';
import { getAttendanceRecordDocId, updateAttendanceRecord } from '../attendance/attendanceActions';

function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}

const EMPTY_EXERCISE = { name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" };

function getExerciseInitial(name) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}

function getExerciseSubtitle(exercise) {
  const sets = exercise.sets || "-";
  const reps = exercise.reps || "-";
  const weight = exercise.weight ? ` · ${exercise.weight}` : "";
  const rest = exercise.rest ? ` · descanso ${exercise.rest}` : "";
  return `${sets} series x ${reps} reps${weight}${rest}`;
}

function getWorkoutSummary(workout) {
  const total = (workout?.exercises || []).length;
  return `${total} exercicio${total === 1 ? "" : "s"}`;
}

function parsePositiveInt(value, fallback = 0) {
  const match = String(value || "").match(/\d+/);
  const parsed = match ? parseInt(match[0], 10) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPlannedSetCount(exercise) {
  return Math.min(parsePositiveInt(exercise.sets, 1), 12);
}

function createDefaultSetLog(exercise) {
  return Array.from({ length: getPlannedSetCount(exercise) }, () => ({
    done: false,
    reps: String(exercise.reps || "").match(/\d+/)?.[0] || "",
    weight: exercise.weight || ""
  }));
}

function getExerciseLog(draft, exerciseIndex, exercise) {
  const existing = draft?.exerciseLogs?.[exerciseIndex]?.sets || [];
  const defaults = createDefaultSetLog(exercise);
  return defaults.map((item, index) => ({
    ...item,
    ...(existing[index] || {})
  }));
}

function hasExerciseLogs(draft) {
  return Object.values(draft?.exerciseLogs || {}).some(log =>
    (log?.sets || []).some(set => set.done || String(set.reps || "").trim() || String(set.weight || "").trim())
  );
}

function getClassKey(dateBR, studentId, time) {
  return `${dateBR}_${studentId}_${time}`;
}

function getNearestTime(times) {
  if (times.length === 0) return "";
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return times.find(time => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute >= currentMinutes;
  }) || times[0];
}

function getActiveWorkout(workoutPlans) {
  if (!workoutPlans || workoutPlans.length === 0) return null;
  return workoutPlans.find(plan => plan.active) || workoutPlans[0];
}

function hasSessionChanges(draft) {
  if (draft?.sessionNote?.trim()) return true;
  if (hasExerciseLogs(draft)) return true;
  return Object.values(draft?.exerciseNotes || {}).some(note => String(note || "").trim());
}

function buildWorkoutVersionFromSession(activeWorkout, draft, selectedDateBR) {
  const exerciseNotes = draft?.exerciseNotes || {};
  return {
    ...activeWorkout,
    name: `${activeWorkout.name} - atualizado ${selectedDateBR}`,
    createdAt: selectedDateBR,
    updatedFromSessionAt: selectedDateBR,
    active: true,
    exercises: (activeWorkout.exercises || []).map((exercise, index) => {
      const sessionChange = String(exerciseNotes[index] || "").trim();
      if (!sessionChange) return { ...exercise };

      const previousNotes = exercise.notes ? `${exercise.notes}\n` : "";
      return {
        ...exercise,
        notes: `${previousNotes}Aula ${selectedDateBR}: ${sessionChange}`
      };
    }),
    sessionSummary: draft?.sessionNote || ""
  };
}

function SessionTab({ students, records, setRecords, payments, scheduleOverrides, locations = [], loadingData, theme }) {
  const { user } = useAuth();
  const [selectedDateISO, setSelectedDateISO] = useState(formatDateISO(new Date()));
  const [selectedTime, setSelectedTime] = useState("");
  const [workoutsByStudent, setWorkoutsByStudent] = useState({});
  const [drafts, setDrafts] = useState({});
  const [editingWorkoutKey, setEditingWorkoutKey] = useState(null);
  const [workoutEditForms, setWorkoutEditForms] = useState({});
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateISO.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateISO]);

  const selectedDateBR = formatDate(selectedDate);

  const classes = useMemo(
    () => getClassesForDate(selectedDateISO, students, scheduleOverrides, locations),
    [selectedDateISO, students, scheduleOverrides, locations]
  );

  const timeSlots = useMemo(
    () => [...new Set(classes.map(cls => cls.time))].sort((a, b) => a.localeCompare(b)),
    [classes]
  );

  useEffect(() => {
    if (timeSlots.length === 0) {
      setSelectedTime("");
      return;
    }
    if (!timeSlots.includes(selectedTime)) {
      setSelectedTime(getNearestTime(timeSlots));
    }
  }, [selectedTime, timeSlots]);

  const classesAtTime = useMemo(
    () => classes.filter(cls => cls.time === selectedTime),
    [classes, selectedTime]
  );

  useEffect(() => {
    const loadWorkouts = async () => {
      if (!user || classesAtTime.length === 0) return;
      const missingStudents = classesAtTime.filter(cls => !workoutsByStudent[cls.studentId]);
      if (missingStudents.length === 0) return;

      setLoadingWorkouts(true);
      try {
        const entries = await Promise.all(missingStudents.map(async cls => {
          const snap = await getDocs(collection(db, `users/${user.uid}/students/${cls.studentId}/workoutPlans`));
          const plans = snap.docs.map(item => ({ id: item.id, ...item.data() }));
          return [cls.studentId, plans];
        }));

        setWorkoutsByStudent(prev => ({
          ...prev,
          ...Object.fromEntries(entries)
        }));
      } catch (error) {
        console.error("Error loading workouts:", error);
        alert("Erro ao carregar treinos");
      } finally {
        setLoadingWorkouts(false);
      }
    };

    loadWorkouts();
  }, [classesAtTime, user, workoutsByStudent]);

  useEffect(() => {
    setDrafts(prev => {
      const next = { ...prev };
      classesAtTime.forEach(cls => {
        const key = getClassKey(selectedDateBR, cls.studentId, cls.time);
        const record = records.find(item => item.key === key);
        if (!next[key]) {
          next[key] = {
            sessionNote: record?.sessionNote || "",
            exerciseNotes: record?.exerciseNotes || {},
            exerciseLogs: record?.exerciseLogs || {}
          };
        }
      });
      return next;
    });
  }, [classesAtTime, records, selectedDateBR]);

  async function saveSessionNotes(classKey) {
    if (!user) return;
    setSavingKey(classKey);
    try {
      const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {} };
      const recordDoc = doc(db, `users/${user.uid}/records/${getAttendanceRecordDocId(classKey)}`);
      await setDoc(recordDoc, {
        key: classKey,
        sessionNote: draft.sessionNote || null,
        exerciseNotes: draft.exerciseNotes || {},
        exerciseLogs: draft.exerciseLogs || {}
      }, { merge: true });

      setRecords(prev => {
        const existing = prev.findIndex(record => record.key === classKey);
        const nextRecord = {
          ...(existing >= 0 ? prev[existing] : { key: classKey, status: null, activity: null, customPrice: null }),
          sessionNote: draft.sessionNote || null,
          exerciseNotes: draft.exerciseNotes || {},
          exerciseLogs: draft.exerciseLogs || {}
        };

        if (existing >= 0) {
          const next = [...prev];
          next[existing] = nextRecord;
          return next;
        }

        return [...prev, nextRecord];
      });
    } catch (error) {
      console.error("Error saving session notes:", error);
      alert("Erro ao salvar anotacoes da aula");
    } finally {
      setSavingKey(null);
    }
  }

  async function markPresent(classKey) {
    if (!user) return;
    setSavingKey(classKey);
    try {
      await updateAttendanceRecord({ user, classKey, status: "present", setRecords });
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Erro ao marcar presenca");
    } finally {
      setSavingKey(null);
    }
  }

  async function markAbsent(classKey) {
    if (!user) return;
    setSavingKey(classKey);
    try {
      await updateAttendanceRecord({ user, classKey, status: "absent", setRecords });
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Erro ao marcar falta");
    } finally {
      setSavingKey(null);
    }
  }

  async function createWorkoutVersionFromClass(classKey, studentId, activeWorkout) {
    if (!user || !activeWorkout) return;
    const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {} };
    if (!hasSessionChanges(draft)) {
      alert("Anote alguma alteracao da aula antes de atualizar o treino.");
      return;
    }

    setSavingKey(`workout-${classKey}`);
    try {
      await saveSessionNotes(classKey);

      await updateDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${activeWorkout.id}`), {
        active: false
      });

      const newWorkout = buildWorkoutVersionFromSession(activeWorkout, draft, selectedDateBR);
      const previousWorkoutId = newWorkout.id;
      delete newWorkout.id;
      newWorkout.previousWorkoutId = previousWorkoutId;
      newWorkout.sourceClassKey = classKey;

      const docRef = await addDoc(collection(db, `users/${user.uid}/students/${studentId}/workoutPlans`), newWorkout);
      setWorkoutsByStudent(prev => {
        const currentPlans = prev[studentId] || [];
        return {
          ...prev,
          [studentId]: [
            { id: docRef.id, ...newWorkout },
            ...currentPlans.map(plan => plan.id === activeWorkout.id ? { ...plan, active: false } : plan)
          ]
        };
      });
    } catch (error) {
      console.error("Error creating workout version:", error);
      alert("Erro ao criar nova versao do treino");
    } finally {
      setSavingKey(null);
    }
  }

  function updateDraft(classKey, updater) {
    setDrafts(prev => ({
      ...prev,
      [classKey]: updater(prev[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {} })
    }));
  }

  function updateExerciseSetLog(classKey, exerciseIndex, setIndex, patch, exercise) {
    updateDraft(classKey, current => {
      const currentLogs = current.exerciseLogs || {};
      const currentSetLogs = currentLogs[exerciseIndex]?.sets || createDefaultSetLog(exercise);
      const nextSetLogs = createDefaultSetLog(exercise).map((defaultSet, index) => ({
        ...defaultSet,
        ...(currentSetLogs[index] || {}),
        ...(index === setIndex ? patch : {})
      }));

      return {
        ...current,
        exerciseLogs: {
          ...currentLogs,
          [exerciseIndex]: {
            sets: nextSetLogs
          }
        }
      };
    });
  }

  function startEditWorkoutFromClass(classKey, activeWorkout) {
    setEditingWorkoutKey(classKey);
    setWorkoutEditForms(prev => ({
      ...prev,
      [classKey]: {
        name: activeWorkout.name || "",
        active: activeWorkout.active !== false,
        exercises: (activeWorkout.exercises || []).map(exercise => ({ ...EMPTY_EXERCISE, ...exercise }))
      }
    }));
  }

  function updateWorkoutEditForm(classKey, updater) {
    setWorkoutEditForms(prev => ({
      ...prev,
      [classKey]: updater(prev[classKey] || { name: "", active: true, exercises: [] })
    }));
  }

  function addWorkoutExercise(classKey) {
    updateWorkoutEditForm(classKey, form => ({
      ...form,
      exercises: [...(form.exercises || []), { ...EMPTY_EXERCISE }]
    }));
  }

  function removeWorkoutExercise(classKey, index) {
    updateWorkoutEditForm(classKey, form => ({
      ...form,
      exercises: (form.exercises || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updateWorkoutExercise(classKey, index, patch) {
    updateWorkoutEditForm(classKey, form => ({
      ...form,
      exercises: (form.exercises || []).map((exercise, itemIndex) => (
        itemIndex === index ? { ...exercise, ...patch } : exercise
      ))
    }));
  }

  async function saveWorkoutEdits(classKey, studentId, activeWorkout) {
    if (!user || !activeWorkout) return;
    const form = workoutEditForms[classKey];
    if (!form?.name?.trim()) {
      alert("Informe o nome do treino.");
      return;
    }
    const exercises = (form.exercises || []).filter(exercise => exercise.name?.trim());
    if (exercises.length === 0) {
      alert("Inclua pelo menos um exercicio no treino.");
      return;
    }

    setSavingKey(`edit-workout-${classKey}`);
    try {
      const payload = {
        name: form.name,
        active: form.active !== false,
        exercises,
        updatedAt: selectedDateBR,
        updatedFromClassKey: classKey
      };
      await updateDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${activeWorkout.id}`), payload);
      setWorkoutsByStudent(prev => ({
        ...prev,
        [studentId]: (prev[studentId] || []).map(plan => (
          plan.id === activeWorkout.id ? { ...plan, ...payload } : plan
        ))
      }));
      setEditingWorkoutKey(null);
    } catch (error) {
      console.error("Error saving workout edits:", error);
      alert("Erro ao salvar edicao do treino");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0", color: "#1f2937" }}>Aula Rapida</h2>
      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 16px 0" }}>Abra o horario, veja todos os alunos juntos e anote ajustes de series, repeticoes e carga.</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", marginBottom: "14px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Data</label>
          <input
            type="date"
            value={selectedDateISO}
            onChange={(event) => setSelectedDateISO(event.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Horario</label>
          <select
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            disabled={timeSlots.length === 0}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "white"
            }}
          >
            {timeSlots.length === 0 ? (
              <option value="">Sem aulas</option>
            ) : timeSlots.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>

      {timeSlots.length > 0 && (
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "8px",
          WebkitOverflowScrolling: "touch"
        }}>
          {timeSlots.map(time => {
            const countAtTime = classes.filter(cls => cls.time === time).length;
            const selected = selectedTime === time;
            return (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                style={{
                  minWidth: "84px",
                  padding: "9px 10px",
                  background: selected ? theme.primary : "white",
                  color: selected ? "white" : "#374151",
                  border: selected ? `1px solid ${theme.primary}` : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: selected ? "0 2px 8px rgba(0,0,0,0.12)" : "none"
                }}
              >
                <span style={{ display: "block" }}>{time}</span>
                <span style={{ display: "block", fontSize: "10px", opacity: 0.85 }}>{countAtTime} aluno{countAtTime === 1 ? "" : "s"}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingData || loadingWorkouts ? (
        <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center", padding: "24px" }}>Carregando...</p>
      ) : classesAtTime.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
          <p style={{ fontSize: "14px", margin: "0" }}>Nenhum aluno nesse horario</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px", alignItems: "start" }}>
          {classesAtTime.map(cls => {
            const classKey = getClassKey(selectedDateBR, cls.studentId, cls.time);
            const record = records.find(item => item.key === classKey);
            const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {} };
            const activeWorkout = getActiveWorkout(workoutsByStudent[cls.studentId]);
            const student = students.find(item => item.id === cls.studentId);
            const creditStatus = student
              ? calculateAdvanceCreditStatus(student, records, payments)
              : { hasAdvancePackage: false, status: "none", remainingClasses: null };
            const billingStatus = student ? calculateBillingStatus(student, records, selectedDate) : null;
            const badgeColors = creditStatus.hasAdvancePackage
              ? getAdvanceCreditStatusColors(creditStatus)
              : billingStatus
                ? getBillingStatusColors(billingStatus)
                : { background: "#f3f4f6", color: "#6b7280" };
            const badgeLabel = creditStatus.hasAdvancePackage
              ? `${getAdvanceCreditStatusLabel(creditStatus)}${creditStatus.remainingClasses !== null ? ` - ${creditStatus.remainingClasses} restantes` : ""}`
              : billingStatus
                ? `${billingStatus.billingTypeLabel} - ${getBillingStatusLabel(billingStatus)}`
                : "Sem cobranca";
            const saving = savingKey === classKey;
            const savingWorkout = savingKey === `workout-${classKey}`;
            const editingWorkout = editingWorkoutKey === classKey;
            const workoutForm = workoutEditForms[classKey] || { name: activeWorkout?.name || "", active: activeWorkout?.active !== false, exercises: activeWorkout?.exercises || [] };

            return (
              <div key={classKey} style={{
                background: "#30364a",
                border: `1px solid ${record?.sessionNote || Object.keys(record?.exerciseNotes || {}).length > 0 ? theme.medium : "#40465c"}`,
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 8px 20px rgba(17, 24, 39, 0.14)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "800", color: "white", margin: "0 0 3px 0" }}>{cls.studentName}</h3>
                    <p style={{ fontSize: "12px", color: "#cbd5e1", margin: "0" }}>
                      {cls.time} {cls.scheduleTypeLabel ? `- ${cls.scheduleTypeLabel}` : ""}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0 0" }}>
                      {cls.locationName || "Sem local"}
                    </p>
                    <span style={{
                      display: "inline-block",
                      marginTop: "6px",
                      padding: "3px 7px",
                      background: badgeColors.background,
                      color: badgeColors.color,
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "800"
                    }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => markPresent(classKey)}
                      disabled={saving}
                      style={{
                        padding: "9px 11px",
                        background: record?.status === "present" ? "#22c55e" : "#475569",
                        color: "white",
                        border: "none",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: saving ? 0.65 : 1
                      }}
                    >
                      <IconCheck /> {record?.status === "present" ? "Presente" : "Marcar"}
                    </button>
                    <button
                      onClick={() => markAbsent(classKey)}
                      disabled={saving}
                      style={{
                        padding: "9px 11px",
                        background: record?.status === "absent" ? "#ef4444" : "transparent",
                        color: record?.status === "absent" ? "white" : "#fecaca",
                        border: "1px solid #fecaca",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.65 : 1
                      }}
                    >
                      Falta
                    </button>
                  </div>
                </div>

                {activeWorkout ? (
                  <div style={{ borderTop: "1px solid #475569", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: "800", color: "white", margin: "0 0 2px 0" }}>{activeWorkout.name}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{getWorkoutSummary(activeWorkout)}</p>
                      </div>
                      <button
                        onClick={() => editingWorkout ? setEditingWorkoutKey(null) : startEditWorkoutFromClass(classKey, activeWorkout)}
                        style={{
                          padding: "8px 11px",
                          background: editingWorkout ? "#475569" : "#14b8a6",
                          color: "white",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: "800",
                          cursor: "pointer",
                          flexShrink: 0
                        }}
                      >
                        {editingWorkout ? "Fechar edicao" : "Editar treino"}
                      </button>
                    </div>

                    {!editingWorkout && <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(activeWorkout.exercises || []).map((exercise, index) => (
                        (() => {
                          const setLogs = getExerciseLog(draft, index, exercise);
                          const doneCount = setLogs.filter(set => set.done).length;
                          return (
                        <div key={`${exercise.name}-${index}`} style={{ background: "#48516b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", overflow: "hidden" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0, 1fr)", gap: "10px", alignItems: "center", padding: "10px" }}>
                            <div style={{
                              width: "54px",
                              height: "54px",
                              borderRadius: "8px",
                              background: "white",
                              color: "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "28px",
                              fontWeight: "500"
                            }}>
                              {getExerciseInitial(exercise.name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: "14px", fontWeight: "800", color: "white", margin: "0 0 3px 0" }}>{index + 1}. {exercise.name}</p>
                                  <p style={{ fontSize: "12px", color: "#d6d9e6", margin: "0" }}>{getExerciseSubtitle(exercise)}</p>
                                  <p style={{ fontSize: "11px", color: doneCount === setLogs.length ? "#86efac" : "#cbd5e1", margin: "4px 0 0 0", fontWeight: "800" }}>
                                    {doneCount}/{setLogs.length} series feitas
                                  </p>
                                </div>
                                <span style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: "800" }}>
                                  {index + 1}
                                </span>
                              </div>
                              {(exercise.muscleGroup || exercise.equipment) && (
                                <p style={{ fontSize: "11px", color: "#aab2c5", margin: "4px 0 0 0" }}>{[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" / ")}</p>
                              )}
                            </div>
                          </div>
                          {exercise.notes && <p style={{ fontSize: "12px", color: "#e5e7eb", margin: "0 10px 8px 74px" }}>{exercise.notes}</p>}
                          <div style={{ display: "flex", flexDirection: "column", gap: "7px", padding: "0 10px 10px 10px" }}>
                            {setLogs.map((setLog, setIndex) => (
                              <div key={setIndex} style={{
                                display: "grid",
                                gridTemplateColumns: "70px minmax(0, 1fr) minmax(0, 1fr)",
                                gap: "7px",
                                alignItems: "center",
                                background: setLog.done ? "rgba(34,197,94,0.18)" : "#30364a",
                                border: `1px solid ${setLog.done ? "rgba(134,239,172,0.45)" : "rgba(255,255,255,0.1)"}`,
                                borderRadius: "8px",
                                padding: "7px"
                              }}>
                                <button
                                  type="button"
                                  onClick={() => updateExerciseSetLog(classKey, index, setIndex, { done: !setLog.done }, exercise)}
                                  style={{
                                    minHeight: "38px",
                                    background: setLog.done ? "#22c55e" : "transparent",
                                    color: setLog.done ? "white" : "#e5e7eb",
                                    border: `1px solid ${setLog.done ? "#22c55e" : "rgba(255,255,255,0.28)"}`,
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    fontWeight: "900",
                                    cursor: "pointer"
                                  }}
                                >
                                  S{setIndex + 1}
                                </button>
                                <label style={{ minWidth: 0 }}>
                                  <span style={{ display: "block", fontSize: "10px", color: "#aab2c5", fontWeight: "800", marginBottom: "3px" }}>Reps feitas</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={setLog.reps || ""}
                                    onChange={(event) => updateExerciseSetLog(classKey, index, setIndex, { reps: event.target.value }, exercise)}
                                    min="0"
                                    placeholder={String(exercise.reps || "")}
                                    style={{
                                      width: "100%",
                                      minHeight: "38px",
                                      padding: "7px 9px",
                                      border: "1px solid rgba(255,255,255,0.14)",
                                      borderRadius: "7px",
                                      background: "#252b3d",
                                      color: "white",
                                      fontSize: "15px",
                                      fontWeight: "800",
                                      boxSizing: "border-box"
                                    }}
                                  />
                                </label>
                                <label style={{ minWidth: 0 }}>
                                  <span style={{ display: "block", fontSize: "10px", color: "#aab2c5", fontWeight: "800", marginBottom: "3px" }}>Carga</span>
                                  <input
                                    type="text"
                                    value={setLog.weight || ""}
                                    onChange={(event) => updateExerciseSetLog(classKey, index, setIndex, { weight: event.target.value }, exercise)}
                                    placeholder={exercise.weight || "kg"}
                                    style={{
                                      width: "100%",
                                      minHeight: "38px",
                                      padding: "7px 9px",
                                      border: "1px solid rgba(255,255,255,0.14)",
                                      borderRadius: "7px",
                                      background: "#252b3d",
                                      color: "white",
                                      fontSize: "15px",
                                      fontWeight: "800",
                                      boxSizing: "border-box"
                                    }}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={draft.exerciseNotes?.[index] || ""}
                            onChange={(event) => updateDraft(classKey, current => ({
                              ...current,
                              exerciseNotes: {
                                ...(current.exerciseNotes || {}),
                                [index]: event.target.value
                              }
                            }))}
                            placeholder="Ex: 4x12, 20kg, reduzir carga..."
                            style={{
                              width: "calc(100% - 20px)",
                              margin: "0 10px 10px 10px",
                              padding: "11px 12px",
                              border: "1px solid rgba(255,255,255,0.14)",
                              borderRadius: "999px",
                              fontSize: "13px",
                              boxSizing: "border-box",
                              fontFamily: "inherit",
                              background: "#30364a",
                              color: "white"
                            }}
                          />
                        </div>
                          );
                        })()
                      ))}
                    </div>}

                    {editingWorkout && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "white", borderRadius: "8px", padding: "12px" }}>
                        <label>
                          <span style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#4b5563", marginBottom: "4px" }}>Nome do treino</span>
                          <input
                            type="text"
                            value={workoutForm.name}
                            onChange={(event) => updateWorkoutEditForm(classKey, form => ({ ...form, name: event.target.value }))}
                            placeholder="Ex: Treino A - Costas"
                            style={{
                              width: "100%",
                              padding: "10px 11px",
                              border: "1px solid #d1d5db",
                              borderRadius: "7px",
                              fontSize: "13px",
                              boxSizing: "border-box",
                              fontFamily: "inherit"
                            }}
                          />
                        </label>
                        {(workoutForm.exercises || []).map((exercise, index) => (
                          <div key={index} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
                              <p style={{ fontSize: "12px", fontWeight: "900", color: "#111827", margin: 0 }}>Exercicio {index + 1}</p>
                              <button
                                onClick={() => removeWorkoutExercise(classKey, index)}
                                style={{
                                  padding: "6px 8px",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  cursor: "pointer"
                                }}
                              >
                                Remover
                              </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(72px, 0.7fr) minmax(82px, 0.8fr)", gap: "8px", marginBottom: "8px" }}>
                              <label style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Nome do exercicio</span>
                                <input
                                  type="text"
                                  value={exercise.name || ""}
                                  onChange={(event) => updateWorkoutExercise(classKey, index, { name: event.target.value })}
                                  placeholder="Ex: Agachamento livre"
                                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                />
                              </label>
                              <label style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Series</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={exercise.sets || ""}
                                  onChange={(event) => updateWorkoutExercise(classKey, index, { sets: event.target.value })}
                                  placeholder="4"
                                  min="1"
                                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                />
                              </label>
                              <label style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Repeticoes</span>
                                <input
                                  type="text"
                                  value={exercise.reps || ""}
                                  onChange={(event) => updateWorkoutExercise(classKey, index, { reps: event.target.value })}
                                  placeholder="10 ou 8-10"
                                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                />
                              </label>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "8px", marginBottom: "8px" }}>
                              <label style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Carga planejada</span>
                                <input
                                  type="text"
                                  value={exercise.weight || ""}
                                  onChange={(event) => updateWorkoutExercise(classKey, index, { weight: event.target.value })}
                                  placeholder="Ex: 40kg"
                                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                />
                              </label>
                              <label style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Tempo de descanso</span>
                                <input
                                  type="text"
                                  value={exercise.rest || ""}
                                  onChange={(event) => updateWorkoutExercise(classKey, index, { rest: event.target.value })}
                                  placeholder="Ex: 90s ou 1min"
                                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                />
                              </label>
                            </div>
                            <label>
                              <span style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#6b7280", marginBottom: "3px" }}>Observacoes e orientacoes</span>
                              <textarea
                                value={exercise.notes || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { notes: event.target.value })}
                                placeholder="Ex: priorizar amplitude, manter postura, evitar dor..."
                                style={{ width: "100%", minHeight: "58px", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
                              />
                            </label>
                          </div>
                        ))}
                        <button
                          onClick={() => addWorkoutExercise(classKey)}
                          style={{
                            padding: "8px",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "800",
                            cursor: "pointer"
                          }}
                        >
                          + Adicionar exercicio
                        </button>
                        <button
                          onClick={() => saveWorkoutEdits(classKey, cls.studentId, activeWorkout)}
                          disabled={savingKey === `edit-workout-${classKey}`}
                          style={{
                            padding: "10px",
                            background: savingKey === `edit-workout-${classKey}` ? "#d1d5db" : theme.primary,
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "800",
                            cursor: savingKey === `edit-workout-${classKey}` ? "not-allowed" : "pointer"
                          }}
                        >
                          {savingKey === `edit-workout-${classKey}` ? "Salvando treino..." : "Salvar treino corrigido"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: "#48516b", border: "1px dashed rgba(255,255,255,0.22)", borderRadius: "8px", padding: "14px" }}>
                    <p style={{ fontSize: "13px", color: "#e5e7eb", margin: "0" }}>Sem treino cadastrado para este aluno.</p>
                  </div>
                )}

                <textarea
                  value={draft.sessionNote}
                  onChange={(event) => updateDraft(classKey, current => ({ ...current, sessionNote: event.target.value }))}
                  placeholder="Notas gerais da aula, dores, substituicoes, percepcao de esforco..."
                  style={{
                    width: "100%",
                    minHeight: "76px",
                    padding: "11px 12px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                    background: "#252b3d",
                    color: "white"
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: activeWorkout ? "1fr 1fr" : "1fr", gap: "8px" }}>
                  <button
                    onClick={() => saveSessionNotes(classKey)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: saving ? "#64748b" : "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: "800",
                      cursor: saving ? "not-allowed" : "pointer"
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar notas"}
                  </button>

                  {activeWorkout && (
                  <button
                    onClick={() => createWorkoutVersionFromClass(classKey, cls.studentId, activeWorkout)}
                    disabled={savingWorkout || !hasSessionChanges(draft)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: savingWorkout || !hasSessionChanges(draft) ? "#475569" : "#3b82f6",
                      color: savingWorkout || !hasSessionChanges(draft) ? "#94a3b8" : "white",
                      border: "none",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: "800",
                      cursor: savingWorkout || !hasSessionChanges(draft) ? "not-allowed" : "pointer"
                    }}
                  >
                    {savingWorkout ? "Atualizando..." : "Nova versao"}
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { SessionTab };
