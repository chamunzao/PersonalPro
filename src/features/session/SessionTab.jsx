import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  getDoc,
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
import { updateAttendanceRecord } from '../attendance/attendanceActions';
import { saveSessionNotes as saveSessionNotesRecord } from '../../services/recordsService';
import { DEMO_EMAIL, getDemoWorkoutPlans } from '../../services/demoData';
import { loadSessionWorkoutEntries } from './sessionWorkouts';
import { buildSessionStudentSummary } from './sessionStudentSummary';
import { getSessionFlowSections } from './sessionClassFlow';
import { persistSessionNotesDraft } from './sessionNotes';

function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}

const EMPTY_EXERCISE = { name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" };
const MAX_VISIBLE_SETS = 8;

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
  if (hasExerciseLogChanges(draft)) return true;
  return Object.values(draft?.exerciseNotes || {}).some(note => String(note || "").trim());
}

function getSetCount(sets) {
  const parsed = parseInt(String(sets || "").match(/\d+/)?.[0] || "0", 10);
  return Math.min(Math.max(parsed || 1, 1), MAX_VISIBLE_SETS);
}

function hasExerciseLogChanges(draft) {
  return Object.values(draft?.exerciseLogs || {}).some(exerciseLog => (
    Object.values(exerciseLog || {}).some(setLog => (
      String(setLog?.repsDone || "").trim() || String(setLog?.weightDone || "").trim()
    ))
  ));
}

function formatExerciseSessionChange(note, exerciseLog) {
  const setLines = Object.entries(exerciseLog || {})
    .filter(([, value]) => String(value?.repsDone || "").trim() || String(value?.weightDone || "").trim())
    .map(([setIndex, value]) => {
      const parts = [];
      if (String(value.repsDone || "").trim()) parts.push(`${value.repsDone} reps`);
      if (String(value.weightDone || "").trim()) parts.push(value.weightDone);
      return `S${Number(setIndex) + 1}: ${parts.join(", ")}`;
    });
  const freeNote = String(note || "").trim();
  return [...setLines, freeNote].filter(Boolean).join("\n");
}

function countCompletedSets(exerciseLog) {
  return Object.values(exerciseLog || {}).filter(setLog => (
    String(setLog?.repsDone || "").trim() || String(setLog?.weightDone || "").trim()
  )).length;
}

function buildWorkoutVersionFromSession(activeWorkout, draft, selectedDateBR) {
  const exerciseNotes = draft?.exerciseNotes || {};
  const exerciseLogs = draft?.exerciseLogs || {};
  return {
    ...activeWorkout,
    name: `${activeWorkout.name} - atualizado ${selectedDateBR}`,
    createdAt: selectedDateBR,
    updatedFromSessionAt: selectedDateBR,
    active: true,
    exercises: (activeWorkout.exercises || []).map((exercise, index) => {
      const sessionChange = formatExerciseSessionChange(exerciseNotes[index], exerciseLogs[index]);
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

function SessionStudentSummaryPanel({ summary }) {
  const hasRiskTags = summary.riskTags.length > 0;

  return (
    <div className="session-student-summary">
      <div className="session-student-summary-top">
        <div>
          <p className="session-student-summary-label">Resumo do aluno</p>
          <strong>{summary.firstName || summary.studentName || "Aluno"}</strong>
        </div>
        {summary.primaryAlert && (
          <span className={`session-student-summary-alert session-student-summary-alert-${summary.primaryAlert.key || summary.financialSeverity}`}>
            {summary.primaryAlert.label}
          </span>
        )}
      </div>

      <div className="session-student-summary-grid">
        <div>
          <span>Financeiro</span>
          <strong>{summary.financialLabel}</strong>
        </div>
        <div>
          <span>Treino</span>
          <strong>{summary.activeWorkoutName || "Sem treino ativo"}</strong>
        </div>
        <div>
          <span>Ultima aula</span>
          <strong>{summary.lastSessionNote || "Sem anotacoes recentes"}</strong>
        </div>
      </div>

      {hasRiskTags && (
        <div className="session-student-summary-risks">
          {summary.riskTags.map(tag => (
            <span key={tag.key} title={tag.detail}>{tag.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionFlowSection({ section, children }) {
  return (
    <section className={`session-flow-section session-flow-section-${section.id} session-flow-state-${section.state}`}>
      <div className="session-flow-header">
        <span>{section.step}</span>
        <div>
          <p>{section.title}</p>
          <small>{section.description}</small>
        </div>
      </div>
      {children}
    </section>
  );
}

function SessionTab({ students, records, setRecords, payments, scheduleOverrides, loadingData, theme }) {
  const { user } = useAuth();
  const [selectedDateISO, setSelectedDateISO] = useState(formatDateISO(new Date()));
  const [selectedTime, setSelectedTime] = useState("");
  const [workoutsByStudent, setWorkoutsByStudent] = useState({});
  const [drafts, setDrafts] = useState({});
  const [editingWorkoutKey, setEditingWorkoutKey] = useState(null);
  const [workoutEditForms, setWorkoutEditForms] = useState({});
  const [workoutLoadErrors, setWorkoutLoadErrors] = useState({});
  const [anamnesisByStudent, setAnamnesisByStudent] = useState({});
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
        const { workoutsByStudent: loadedWorkouts, errorsByStudent } = await loadSessionWorkoutEntries({
          studentsToLoad: missingStudents,
          isDemoAccount: user.email === DEMO_EMAIL,
          getDemoWorkoutPlans,
          fetchWorkoutPlans: async (studentId) => {
            const snap = await getDocs(collection(db, `users/${user.uid}/students/${studentId}/workoutPlans`));
            return snap.empty && user.email === DEMO_EMAIL
              ? getDemoWorkoutPlans(studentId)
              : snap.docs.map(item => ({ id: item.id, ...item.data() }));
          }
        });

        setWorkoutsByStudent(prev => ({
          ...prev,
          ...loadedWorkouts
        }));
        setWorkoutLoadErrors(prev => {
          const next = { ...prev };
          missingStudents.forEach(cls => {
            if (errorsByStudent[cls.studentId]) {
              next[cls.studentId] = errorsByStudent[cls.studentId];
            } else {
              delete next[cls.studentId];
            }
          });
          return next;
        });
      } catch (error) {
        console.error("Unexpected workout loading error:", error);
      } finally {
        setLoadingWorkouts(false);
      }
    };

    loadWorkouts();
  }, [classesAtTime, user, workoutsByStudent]);

  useEffect(() => {
    const loadAnamnesis = async () => {
      if (!user || classesAtTime.length === 0) return;
      const missingStudents = classesAtTime.filter(cls => (
        !Object.prototype.hasOwnProperty.call(anamnesisByStudent, cls.studentId)
      ));
      if (missingStudents.length === 0) return;

      const loadedEntries = await Promise.all(missingStudents.map(async (cls) => {
        if (user.email === DEMO_EMAIL) return [cls.studentId, {}];

        try {
          const snap = await getDoc(doc(db, `users/${user.uid}/students/${cls.studentId}/profile/anamnesis`));
          return [cls.studentId, snap.exists() ? snap.data() : {}];
        } catch (error) {
          console.error("Error loading student anamnesis:", error);
          return [cls.studentId, {}];
        }
      }));

      setAnamnesisByStudent(prev => ({
        ...prev,
        ...Object.fromEntries(loadedEntries)
      }));
    };

    loadAnamnesis();
  }, [anamnesisByStudent, classesAtTime, user]);

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
      const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {} };
      await persistSessionNotesDraft({
        userId: user.uid,
        classKey,
        draft,
        saveSessionNotesRecord,
        setRecords
      });
    } catch (error) {
      console.error("Error saving session notes:", error);
      alert("Erro ao salvar anotações da aula");
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
      alert("Erro ao marcar presença");
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
      alert("Anote alguma alteração da aula antes de atualizar o treino.");
      return;
    }

    setSavingKey(`workout-${classKey}`);
    try {
      await persistSessionNotesDraft({
        userId: user.uid,
        classKey,
        draft,
        saveSessionNotesRecord,
        setRecords
      });

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
      alert("Erro ao criar nova versão do treino");
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
      alert("Inclua pelo menos um exercício no treino.");
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
      alert("Erro ao salvar edição do treino");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="session-page">
      <section className="app-card session-command-panel">
        <div>
          <p className="dashboard-kicker">AULA DO HORÁRIO</p>
          <h2 className="session-page-title">Aula Rápida</h2>
          <p className="session-page-kicker">Marque presença, acompanhe treinos e registre séries, repetições e carga no mesmo fluxo.</p>
          <div className="session-hero-summary">
            <div>
              <p>Horário aberto</p>
              <strong>{selectedTime || "--:--"}</strong>
            </div>
            <span>{classesAtTime.length} aluno{classesAtTime.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="session-command-grid">
        <div>
          <label className="session-field-label">Data</label>
          <input
            type="date"
            value={selectedDateISO}
            onChange={(event) => setSelectedDateISO(event.target.value)}
            className="session-input"
          />
        </div>
        <div>
          <label className="session-field-label">Horário</label>
          <select
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            disabled={timeSlots.length === 0}
            className="session-input"
          >
            {timeSlots.length === 0 ? (
              <option value="">Sem aulas</option>
            ) : timeSlots.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      </section>

      {timeSlots.length > 0 && (
        <div className="session-time-strip">
          {timeSlots.map(time => {
            const countAtTime = classes.filter(cls => cls.time === time).length;
            const selected = selectedTime === time;
            return (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`session-time-chip ${selected ? "session-time-chip-active" : ""}`}
              >
                <span style={{ display: "block", fontSize: "14px", fontWeight: "900" }}>{time}</span>
                <span style={{ display: "block", fontSize: "11px", opacity: 0.82, fontWeight: "800", marginTop: "2px" }}>{countAtTime} aluno{countAtTime === 1 ? "" : "s"}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingData || loadingWorkouts ? (
        <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center", padding: "24px" }}>Carregando...</p>
      ) : classesAtTime.length === 0 ? (
        <div className="session-empty">
          <p style={{ fontSize: "14px", fontWeight: "850", margin: "0 0 4px", color: "#334155" }}>Nenhum aluno nesse horário</p>
          <p style={{ fontSize: "12px", margin: "0" }}>Escolha outro horário ou ajuste a data da aula.</p>
        </div>
      ) : (
        <div className="session-list">
          {classesAtTime.map(cls => {
            const classKey = getClassKey(selectedDateBR, cls.studentId, cls.time);
            const record = records.find(item => item.key === classKey);
            const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {} };
            const activeWorkout = getActiveWorkout(workoutsByStudent[cls.studentId]);
            const workoutLoadError = workoutLoadErrors[cls.studentId];
            const student = students.find(item => item.id === cls.studentId);
            const studentSummary = buildSessionStudentSummary({
              student,
              records,
              payments,
              anamnesis: anamnesisByStudent[cls.studentId],
              activeWorkout,
              selectedDate
            });
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
                : "Sem cobrança";
            const saving = savingKey === classKey;
            const savingWorkout = savingKey === `workout-${classKey}`;
            const editingWorkout = editingWorkoutKey === classKey;
            const workoutForm = workoutEditForms[classKey] || { name: activeWorkout?.name || "", active: activeWorkout?.active !== false, exercises: activeWorkout?.exercises || [] };

            const hasNotes = record?.sessionNote || Object.keys(record?.exerciseNotes || {}).length > 0 || Object.keys(record?.exerciseLogs || {}).length > 0;
            const draftHasChanges = hasSessionChanges(draft);
            const flowSections = getSessionFlowSections({
              hasWorkout: Boolean(activeWorkout),
              hasSessionChanges: draftHasChanges,
              recordStatus: record?.status || ""
            });
            const beforeSection = flowSections.find(section => section.id === "before");
            const duringSection = flowSections.find(section => section.id === "during");
            const afterSection = flowSections.find(section => section.id === "after");

            return (
              <div key={classKey} className={`session-student-card ${hasNotes ? "session-student-card-active" : ""}`}>
                <div className="session-student-header">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="session-student-name">{cls.studentName}</h3>
                    <p className="session-student-meta">
                      {cls.time} {cls.scheduleTypeLabel ? `- ${cls.scheduleTypeLabel}` : ""}
                    </p>
                    <p className="session-student-place">{cls.location || student?.location || "Sem local"}</p>
                    <span style={{
                      display: "inline-block",
                      marginTop: "6px",
                      padding: "3px 7px",
                      background: badgeColors.background,
                      color: badgeColors.color,
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: "900"
                    }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="session-student-actions">
                    <button
                      onClick={() => markPresent(classKey)}
                      disabled={saving}
                      className="session-action-primary"
                      style={{ opacity: saving ? 0.65 : 1, background: record?.status === "present" ? "rgba(242, 207, 124, 0.14)" : theme.primary, color: record?.status === "present" ? "#F2CF7C" : "#142339" }}
                    >
                      <IconCheck /> {record?.status === "present" ? "Presente" : "Marcar"}
                    </button>
                    <button
                      onClick={() => markAbsent(classKey)}
                      disabled={saving}
                      className="session-action-danger"
                      style={{ opacity: saving ? 0.65 : 1, background: record?.status === "absent" ? "#fee2e2" : "white" }}
                    >
                      Falta
                    </button>
                  </div>
                </div>

                <SessionFlowSection section={beforeSection}>
                  <SessionStudentSummaryPanel summary={studentSummary} />
                </SessionFlowSection>

                <SessionFlowSection section={duringSection}>
                {workoutLoadError ? (
                  <div className="session-card-body">
                    <div className="session-workout-error">
                      <p>Não consegui carregar o treino deste aluno.</p>
                      <small>Isso normalmente acontece quando as regras do Firebase ainda não permitem ler os treinos. O aluno e a presença continuam disponíveis.</small>
                    </div>
                  </div>
                ) : activeWorkout ? (
                  <div className="session-card-body">
                    <div className="session-workout-header">
                      <div>
                        <p className="session-workout-name">{activeWorkout.name}</p>
                        <p className="session-workout-count">{(activeWorkout.exercises || []).length} exercícios</p>
                      </div>
                      <button
                        onClick={() => editingWorkout ? setEditingWorkoutKey(null) : startEditWorkoutFromClass(classKey, activeWorkout)}
                        className="session-action-muted"
                        style={{ flexShrink: 0 }}
                      >
                        {editingWorkout ? "Fechar edição" : "Editar treino"}
                      </button>
                    </div>

                    {!editingWorkout && <div className="session-exercise-list">
                      {(activeWorkout.exercises || []).map((exercise, index) => (
                        <div key={`${exercise.name}-${index}`} className="session-exercise">
                          <div className="session-exercise-title-row">
                            <div className="session-exercise-letter">{String.fromCharCode(65 + (index % 26))}</div>
                            <div className="session-exercise-copy">
                              <p className="session-exercise-name">{index + 1}. {exercise.name}</p>
                              <p className="session-exercise-prescription">
                                {exercise.sets || "-"} séries x {exercise.reps || "-"} reps
                                {exercise.weight ? ` · ${exercise.weight}` : ""}
                                {exercise.rest ? ` · descanso ${exercise.rest}` : ""}
                              </p>
                              <p className="session-exercise-progress">{countCompletedSets(draft.exerciseLogs?.[index])}/{getSetCount(exercise.sets)} séries feitas</p>
                              {(exercise.muscleGroup || exercise.equipment) && (
                                <p className="session-exercise-equipment">{[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" / ")}</p>
                              )}
                              {exercise.notes && <p className="session-exercise-note">{exercise.notes}</p>}
                            </div>
                            <span className="session-exercise-index">{index + 1}</span>
                          </div>
                          <div className="session-set-list">
                            {Array.from({ length: getSetCount(exercise.sets) }).map((_, setIndex) => {
                              const setLog = draft.exerciseLogs?.[index]?.[setIndex] || {};
                              return (
                                <div className="session-set-row" key={setIndex}>
                                  <span className="session-set-badge">S{setIndex + 1}</span>
                                  <label className="session-set-field">
                                    <span>Reps feitas</span>
                                    <input
                                      type="text"
                                      value={setLog.repsDone || ""}
                                      onChange={(event) => updateDraft(classKey, current => ({
                                        ...current,
                                        exerciseLogs: {
                                          ...(current.exerciseLogs || {}),
                                          [index]: {
                                            ...((current.exerciseLogs || {})[index] || {}),
                                            [setIndex]: {
                                              ...(((current.exerciseLogs || {})[index] || {})[setIndex] || {}),
                                              repsDone: event.target.value
                                            }
                                          }
                                        }
                                      }))}
                                      placeholder={exercise.reps || "10"}
                                      className="session-set-input"
                                    />
                                  </label>
                                  <label className="session-set-field">
                                    <span>Carga</span>
                                    <input
                                      type="text"
                                      value={setLog.weightDone || ""}
                                      onChange={(event) => updateDraft(classKey, current => ({
                                        ...current,
                                        exerciseLogs: {
                                          ...(current.exerciseLogs || {}),
                                          [index]: {
                                            ...((current.exerciseLogs || {})[index] || {}),
                                            [setIndex]: {
                                              ...(((current.exerciseLogs || {})[index] || {})[setIndex] || {}),
                                              weightDone: event.target.value
                                            }
                                          }
                                        }
                                      }))}
                                      placeholder={exercise.weight || "Carga"}
                                      className="session-set-input"
                                    />
                                  </label>
                                </div>
                              );
                            })}
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
                            className="session-note-input"
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
                                placeholder="Exercício"
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                              />
                              <input
                                type="text"
                                value={exercise.sets || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { sets: event.target.value })}
                                placeholder="Séries"
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
                              placeholder="Observações do exercício"
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
                              Remover exercício
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
                          + Adicionar exercício
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
                  <div className="session-card-body">
                    <div style={{ background: "#f8faf9", border: "1px dashed rgba(15, 23, 42, 0.14)", borderRadius: "10px", padding: "14px" }}>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0" }}>Sem treino cadastrado para este aluno.</p>
                    </div>
                  </div>
                )}
                </SessionFlowSection>

                <SessionFlowSection section={afterSection}>
                <div className="session-card-body">
                  <label className="session-field-label">Notas gerais da aula</label>
                <textarea
                  value={draft.sessionNote}
                  onChange={(event) => updateDraft(classKey, current => ({ ...current, sessionNote: event.target.value }))}
                  placeholder="Notas gerais da aula, dores, substituições, percepção de esforço..."
                  className="session-note-area"
                />
                </div>

                <div className="session-save-row" style={{ gridTemplateColumns: activeWorkout ? undefined : "1fr" }}>
                  <button
                    onClick={() => saveSessionNotes(classKey)}
                    disabled={saving}
                    className="session-action-primary"
                    style={{ width: "100%", background: saving ? "#d1d5db" : theme.primary, borderColor: saving ? "#d1d5db" : theme.primary, cursor: saving ? "not-allowed" : "pointer" }}
                  >
                    {saving ? "Salvando..." : "Salvar notas"}
                  </button>

                  {activeWorkout && (
                  <button
                    onClick={() => createWorkoutVersionFromClass(classKey, cls.studentId, activeWorkout)}
                    disabled={savingWorkout || !draftHasChanges}
                    className="session-action-muted"
                    style={{ width: "100%", background: savingWorkout || !draftHasChanges ? "#e5e7eb" : "#111827", color: savingWorkout || !draftHasChanges ? "#9ca3af" : "white", cursor: savingWorkout || !draftHasChanges ? "not-allowed" : "pointer" }}
                  >
                    {savingWorkout ? "Atualizando..." : "Nova versão"}
                  </button>
                  )}
                </div>
                </SessionFlowSection>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { SessionTab };
