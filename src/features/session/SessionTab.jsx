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

function SessionTab({ students, records, setRecords, payments, scheduleOverrides, loadingData, theme }) {
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
    () => getClassesForDate(selectedDateISO, students, scheduleOverrides),
    [selectedDateISO, students, scheduleOverrides]
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
            exerciseNotes: record?.exerciseNotes || {}
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
      const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {} };
      const recordDoc = doc(db, `users/${user.uid}/records/${getAttendanceRecordDocId(classKey)}`);
      await setDoc(recordDoc, {
        key: classKey,
        sessionNote: draft.sessionNote || null,
        exerciseNotes: draft.exerciseNotes || {}
      }, { merge: true });

      setRecords(prev => {
        const existing = prev.findIndex(record => record.key === classKey);
        const nextRecord = {
          ...(existing >= 0 ? prev[existing] : { key: classKey, status: null, activity: null, customPrice: null }),
          sessionNote: draft.sessionNote || null,
          exerciseNotes: draft.exerciseNotes || {}
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
    const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {} };
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
      [classKey]: updater(prev[classKey] || { sessionNote: "", exerciseNotes: {} })
    }));
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
          {classesAtTime.map(cls => {
            const classKey = getClassKey(selectedDateBR, cls.studentId, cls.time);
            const record = records.find(item => item.key === classKey);
            const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {} };
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
                background: "white",
                border: `1px solid ${record?.sessionNote || Object.keys(record?.exerciseNotes || {}).length > 0 ? theme.medium : "#e5e7eb"}`,
                borderRadius: "8px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 3px 0" }}>{cls.studentName}</h3>
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "0" }}>
                      {cls.time} {cls.scheduleTypeLabel ? `- ${cls.scheduleTypeLabel}` : ""}
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
                        padding: "7px 10px",
                        background: record?.status === "present" ? "#d1fae5" : theme.primary,
                        color: record?.status === "present" ? "#047857" : "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
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
                        padding: "7px 10px",
                        background: record?.status === "absent" ? "#fee2e2" : "white",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.65 : 1
                      }}
                    >
                      Falta
                    </button>
                  </div>
                </div>

                {activeWorkout ? (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "800", color: theme.primary, margin: "0" }}>{activeWorkout.name}</p>
                      <button
                        onClick={() => editingWorkout ? setEditingWorkoutKey(null) : startEditWorkoutFromClass(classKey, activeWorkout)}
                        style={{
                          padding: "5px 8px",
                          background: editingWorkout ? "#f3f4f6" : theme.light,
                          color: editingWorkout ? "#6b7280" : theme.dark,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                          cursor: "pointer",
                          flexShrink: 0
                        }}
                      >
                        {editingWorkout ? "Fechar edicao" : "Editar treino"}
                      </button>
                    </div>

                    {!editingWorkout && <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(activeWorkout.exercises || []).map((exercise, index) => (
                        <div key={`${exercise.name}-${index}`} style={{ background: "#f9fafb", border: "1px solid #eef2f7", borderRadius: "8px", padding: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "13px", fontWeight: "700", color: "#1f2937", margin: "0" }}>{exercise.name}</p>
                              {(exercise.muscleGroup || exercise.equipment) && (
                                <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0 0" }}>{[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" / ")}</p>
                              )}
                            </div>
                            <span style={{ fontSize: "12px", color: "#374151", fontWeight: "700", whiteSpace: "nowrap" }}>
                              {exercise.sets || "-"}s x {exercise.reps || "-"}r {exercise.weight ? `@ ${exercise.weight}` : ""}
                            </span>
                          </div>
                          {exercise.notes && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 6px 0" }}>{exercise.notes}</p>}
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
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "12px",
                              boxSizing: "border-box",
                              fontFamily: "inherit"
                            }}
                          />
                        </div>
                      ))}
                    </div>}

                    {editingWorkout && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input
                          type="text"
                          value={workoutForm.name}
                          onChange={(event) => updateWorkoutEditForm(classKey, form => ({ ...form, name: event.target.value }))}
                          placeholder="Nome do treino"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
                            boxSizing: "border-box",
                            fontFamily: "inherit"
                          }}
                        />
                        {(workoutForm.exercises || []).map((exercise, index) => (
                          <div key={index} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px", gap: "6px", marginBottom: "6px" }}>
                              <input
                                type="text"
                                value={exercise.name || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { name: event.target.value })}
                                placeholder="Exercicio"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                              <input
                                type="text"
                                value={exercise.sets || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { sets: event.target.value })}
                                placeholder="Series"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                              <input
                                type="text"
                                value={exercise.reps || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { reps: event.target.value })}
                                placeholder="Reps"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                              <input
                                type="text"
                                value={exercise.weight || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { weight: event.target.value })}
                                placeholder="Carga"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                              <input
                                type="text"
                                value={exercise.rest || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { rest: event.target.value })}
                                placeholder="Descanso"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                            </div>
                            <textarea
                              value={exercise.notes || ""}
                              onChange={(event) => updateWorkoutExercise(classKey, index, { notes: event.target.value })}
                              placeholder="Observacoes do exercicio"
                              style={{ width: "100%", minHeight: "44px", padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", marginBottom: "6px" }}
                            />
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
                              Remover exercicio
                            </button>
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
                  <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "8px", padding: "12px" }}>
                    <p style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>Sem treino cadastrado para este aluno.</p>
                  </div>
                )}

                <textarea
                  value={draft.sessionNote}
                  onChange={(event) => updateDraft(classKey, current => ({ ...current, sessionNote: event.target.value }))}
                  placeholder="Notas gerais da aula, dores, substituicoes, percepcao de esforco..."
                  style={{
                    width: "100%",
                    minHeight: "76px",
                    padding: "9px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: activeWorkout ? "1fr 1fr" : "1fr", gap: "8px" }}>
                  <button
                    onClick={() => saveSessionNotes(classKey)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: saving ? "#d1d5db" : theme.primary,
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
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
                      padding: "10px",
                      background: savingWorkout || !hasSessionChanges(draft) ? "#e5e7eb" : "#111827",
                      color: savingWorkout || !hasSessionChanges(draft) ? "#9ca3af" : "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
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
