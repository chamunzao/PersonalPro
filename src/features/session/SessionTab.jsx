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
import { getScheduleItemsForStudent } from '../schedule/scheduleCalculations';
import { updateAttendanceRecord } from '../attendance/attendanceActions';
import { saveSessionNotes as saveSessionNotesRecord } from '../../services/recordsService';
import { DEMO_EMAIL, getDemoWorkoutPlans } from '../../services/demoData';
import { loadSessionWorkoutEntries } from './sessionWorkouts';
import { buildSessionStudentSummary } from './sessionStudentSummary';
import { buildSessionClassCenterSummary } from './sessionClassCenter';
import { getSessionFlowSections } from './sessionClassFlow';
import { persistSessionNotesDraft } from './sessionNotes';
import { buildSessionCheckoutSummary, hasSessionCheckoutChanges } from './sessionCheckoutUtils';
import { EXERCISE_QUICK_ACTIONS, appendExerciseQuickAction } from './sessionExerciseQuickActions';
import { applySessionSetAction, buildSessionSetRowsWithAdjustment, buildSessionWorkoutRows, getCompactSetCount } from './sessionWorkoutLayout';
import { addDropSetStep, addExecutedExercise, addExecutedExercises, addExecutedSet, createExerciseGroup, duplicateExecutedSet, ensureExecutedWorkout, removeBisetGroup, removeDropSetStep, removeExecutedSet, reorderExerciseGroup, transformSetToDropSet, undoDropSet, updateDropSetStep, updateExecutedSetMeta } from './sessionExecutedWorkout';
import { buildSessionExecutionPanel, completeCurrentSessionSet, stepCurrentSessionSetValue, updateCurrentSessionSetValue } from './sessionExecutionPanel';
import { buildSessionExerciseGroupBlocks, getExerciseGroupCandidateIds, getExerciseGroupLabel } from './sessionExerciseGroups';
import { buildExercisePickerFilters, filterExercisePickerLibrary, toggleExercisePickerSelection } from './sessionExercisePicker';
import { hasOpenSetActionMenu, isSetMenuInteractionTarget } from './sessionSetMenus';
import { ReplacementFlow } from '../schedule/ReplacementFlow';
import { buildReplacementOverride } from '../schedule/replacementActions';
import { EXERCISE_LIBRARY } from '../workouts/workoutPresets';

function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}

const EMPTY_EXERCISE = { name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "", technique: "", groupName: "" };

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
  if (hasSessionCheckoutChanges(draft?.sessionCheckout)) return true;
  if (draft?.executedWorkout) return true;
  return Object.values(draft?.exerciseNotes || {}).some(note => String(note || "").trim());
}

function getSetCount(sets) {
  return getCompactSetCount(sets);
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
    sessionSummary: [draft?.sessionNote || "", buildSessionCheckoutSummary(draft?.sessionCheckout)]
      .filter(Boolean)
      .join("\n\n")
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

function SessionTab({ students, records, setRecords, payments, scheduleOverrides, setScheduleOverrides = () => {}, loadingData, theme }) {
  const { user } = useAuth();
  const [selectedDateISO, setSelectedDateISO] = useState(formatDateISO(new Date()));
  const [selectedTime, setSelectedTime] = useState("");
  const [activeClassKey, setActiveClassKey] = useState("");
  const [workoutsByStudent, setWorkoutsByStudent] = useState({});
  const [drafts, setDrafts] = useState({});
  const [editingWorkoutKey, setEditingWorkoutKey] = useState(null);
  const [workoutEditForms, setWorkoutEditForms] = useState({});
  const [workoutLoadErrors, setWorkoutLoadErrors] = useState({});
  const [anamnesisByStudent, setAnamnesisByStudent] = useState({});
  const [replacementFlow, setReplacementFlow] = useState(null);
  const [expandedExercises, setExpandedExercises] = useState({});
  const [exerciseAdjustments, setExerciseAdjustments] = useState({});
  const [setActionMenus, setSetActionMenus] = useState({});
  const [addExerciseForms, setAddExerciseForms] = useState({});
  const [exercisePickers, setExercisePickers] = useState({});
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateISO.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateISO]);

  const selectedDateBR = formatDate(selectedDate);
  const exercisePickerFilters = useMemo(() => buildExercisePickerFilters(EXERCISE_LIBRARY), []);

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
    if (classesAtTime.length === 0) {
      setActiveClassKey("");
      return;
    }

    const keys = classesAtTime.map(cls => getClassKey(selectedDateBR, cls.studentId, cls.time));
    if (!keys.includes(activeClassKey)) {
      setActiveClassKey(keys[0]);
    }
  }, [activeClassKey, classesAtTime, selectedDateBR]);

  useEffect(() => {
    if (!hasOpenSetActionMenu(setActionMenus)) return undefined;

    function closeMenusOnOutsideClick(event) {
      if (isSetMenuInteractionTarget(event.target)) return;
      setSetActionMenus({});
    }

    function closeMenusOnEscape(event) {
      if (event.key === "Escape") {
        setSetActionMenus({});
      }
    }

    document.addEventListener("pointerdown", closeMenusOnOutsideClick);
    document.addEventListener("keydown", closeMenusOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
      document.removeEventListener("keydown", closeMenusOnEscape);
    };
  }, [setActionMenus]);

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
            exerciseLogs: record?.exerciseLogs || {},
            executedWorkout: record?.executedWorkout || null,
            sessionCheckout: record?.sessionCheckout || {}
          };
        }
      });
      return next;
    });
  }, [classesAtTime, records, selectedDateBR]);

  async function saveSessionNotes(classKey, activeWorkout = null) {
    if (!user) return;
    setSavingKey(classKey);
    try {
      const draft = drafts[classKey] || { sessionNote: "", exerciseNotes: {} };
      const draftToSave = activeWorkout
        ? { ...draft, executedWorkout: draft.executedWorkout || ensureExecutedWorkout(null, activeWorkout) }
        : draft;
      await persistSessionNotesDraft({
        userId: user.uid,
        classKey,
        draft: draftToSave,
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

  async function markAbsent(classKey, cls) {
    if (!user) return;
    setSavingKey(classKey);
    try {
      await updateAttendanceRecord({ user, classKey, status: "absent", setRecords });
      if (cls) {
        const student = students.find(item => item.id === cls.studentId);
        setReplacementFlow({
          classKey,
          cls,
          student,
          missedClass: {
            date: selectedDateBR,
            time: cls.time
          }
        });
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Erro ao marcar falta");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveAbsenceReason(classKey, reason) {
    if (!user) return;
    await updateAttendanceRecord({
      user,
      classKey,
      status: "absent",
      activity: String(reason || "").trim(),
      setRecords
    });
  }

  async function saveReplacement({ student, cls, dateISO, time, note, reason }) {
    if (!user || !student) return;
    if (reason) {
      await saveAbsenceReason(`${selectedDateBR}_${student.id}_${cls.time}`, reason);
    }

    const targetOverride = scheduleOverrides.find(item => item.date === dateISO && item.studentId === student.id);
    const targetItems = getScheduleItemsForStudent(dateISO, student, targetOverride);
    if (targetItems.some(item => item.time === time)) {
      alert("Este aluno ja tem aula nesse horario.");
      return;
    }

    const { overrideId, payload } = buildReplacementOverride({
      dateISO,
      studentId: student.id,
      existingItems: targetItems,
      replacementTime: time,
      note,
      pricePerClass: cls.pricePerClass,
      locationId: cls.locationId || student.defaultLocationId || ""
    });

    await setDoc(doc(db, `users/${user.uid}/scheduleOverrides/${overrideId}`), payload);
    setScheduleOverrides(prev => {
      const nextOverride = {
        key: overrideId,
        date: dateISO,
        studentId: student.id,
        ...payload
      };
      const existing = prev.findIndex(item => item.key === overrideId);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = nextOverride;
        return next;
      }
      return [...prev, nextOverride];
    });
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
      [classKey]: updater(prev[classKey] || { sessionNote: "", exerciseNotes: {}, exerciseLogs: {}, sessionCheckout: {} })
    }));
  }

  function applyExerciseQuickAction(classKey, exerciseIndex, actionId) {
    updateDraft(classKey, current => ({
      ...current,
      exerciseNotes: {
        ...(current.exerciseNotes || {}),
        [exerciseIndex]: appendExerciseQuickAction((current.exerciseNotes || {})[exerciseIndex], actionId)
      }
    }));
  }

  function toggleExerciseDetails(classKey, exerciseIndex) {
    const key = `${classKey}-${exerciseIndex}`;
    setExpandedExercises(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function applyExerciseSetAction(classKey, exerciseIndex, setIndex, actionId) {
    const key = `${classKey}-${exerciseIndex}`;
    setExerciseAdjustments(prev => ({
      ...prev,
      [key]: applySessionSetAction(prev[key] || {}, actionId, setIndex)
    }));
    setSetActionMenus(prev => ({
      ...prev,
      [`${key}-${setIndex}`]: false
    }));
  }

  function toggleSetActionMenu(classKey, exerciseIndex, setIndex) {
    const key = `${classKey}-${exerciseIndex}-${setIndex}`;
    setSetActionMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function updateExecutedWorkout(classKey, activeWorkout, updater) {
    updateDraft(classKey, current => {
      const executedWorkout = ensureExecutedWorkout(current.executedWorkout, activeWorkout);
      return {
        ...current,
        executedWorkout: updater(executedWorkout)
      };
    });
  }

  function applyExecutedSetAction(classKey, activeWorkout, exerciseId, seriesId, actionId) {
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => {
      if (actionId === "add-set") return addExecutedSet(executedWorkout, exerciseId);
      if (actionId === "drop-set") return transformSetToDropSet(executedWorkout, exerciseId, seriesId);
      if (actionId === "add-drop-step") return addDropSetStep(executedWorkout, exerciseId, seriesId);
      if (actionId === "undo-drop-set") return undoDropSet(executedWorkout, exerciseId, seriesId);
      if (actionId === "duplicate-set") return duplicateExecutedSet(executedWorkout, exerciseId, seriesId);
      if (actionId === "warmup") return updateExecutedSetMeta(executedWorkout, exerciseId, seriesId, { type: "warmup" });
      return executedWorkout;
    });
    setSetActionMenus(prev => ({
      ...prev,
      [`${classKey}-${exerciseId}-${seriesId}`]: false
    }));
  }

  function updateExecutedSetNote(classKey, activeWorkout, exerciseId, seriesId, previousNote = "") {
    const note = window.prompt("Observacao da serie", previousNote || "");
    if (note === null) return;
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => updateExecutedSetMeta(executedWorkout, exerciseId, seriesId, { notes: note }));
    setSetActionMenus(prev => ({
      ...prev,
      [`${classKey}-${exerciseId}-${seriesId}`]: false
    }));
  }

  function hasSetDataForRemoval(sessionWorkout, draft, exerciseIndex, exerciseId, seriesId) {
    const exercise = (sessionWorkout?.exercises || [])[exerciseIndex] || {};
    const series = (exercise.series || []).find(item => item.id === seriesId);
    const setLog = draft.exerciseLogs?.[exerciseIndex]?.[seriesId] || {};
    return Boolean(
      setLog.completed
      || String(setLog.repsDone || "").trim()
      || String(setLog.weightDone || "").trim()
      || series?.completed
      || series?.dropSteps?.some(step => step.completed || String(step.reps || "").trim() || String(step.weight || "").trim())
      || String(series?.notes || "").trim()
    );
  }

  function removeExecutedSetFromClass(classKey, activeWorkout, sessionWorkout, draft, exerciseIndex, exerciseId, seriesId) {
    if (hasSetDataForRemoval(sessionWorkout, draft, exerciseIndex, exerciseId, seriesId)) {
      const confirmed = window.confirm("Esta serie tem dados preenchidos. Remover mesmo assim?");
      if (!confirmed) return;
    }

    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => removeExecutedSet(executedWorkout, exerciseId, seriesId));
    updateDraft(classKey, current => {
      const exerciseLog = { ...((current.exerciseLogs || {})[exerciseIndex] || {}) };
      delete exerciseLog[seriesId];
      return {
        ...current,
        exerciseLogs: {
          ...(current.exerciseLogs || {}),
          [exerciseIndex]: exerciseLog
        }
      };
    });
    setSetActionMenus(prev => ({
      ...prev,
      [`${classKey}-${exerciseId}-${seriesId}`]: false
    }));
  }

  function addExecutedExerciseFromForm(classKey, activeWorkout, afterExerciseId) {
    const formKey = `${classKey}-${afterExerciseId || "end"}`;
    const form = addExerciseForms[formKey] || {};
    if (!String(form.name || "").trim()) return;
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => addExecutedExercise(
      executedWorkout,
      {
        name: form.name,
        sets: form.sets || "3",
        reps: form.reps || "10",
        weight: form.weight || "",
        rest: form.rest || "",
        notes: form.notes || ""
      },
      { afterExerciseId }
    ));
    setAddExerciseForms(prev => ({
      ...prev,
      [formKey]: {}
    }));
  }

  function updateAddExerciseForm(classKey, afterExerciseId, patch) {
    const formKey = `${classKey}-${afterExerciseId || "end"}`;
    setAddExerciseForms(prev => ({
      ...prev,
      [formKey]: {
        ...(prev[formKey] || {}),
        ...patch
      }
    }));
  }

  function getExercisePickerKey(classKey, afterExerciseId) {
    return `${classKey}-${afterExerciseId || "end"}`;
  }

  function updateExercisePicker(classKey, afterExerciseId, patch) {
    const pickerKey = getExercisePickerKey(classKey, afterExerciseId);
    setExercisePickers(prev => ({
      ...prev,
      [pickerKey]: {
        selectedNames: [],
        search: "",
        muscleGroup: "",
        equipment: "",
        sets: "3",
        reps: "10",
        weight: "",
        rest: "60s",
        notes: "",
        ...(prev[pickerKey] || {}),
        ...patch
      }
    }));
  }

  function toggleExercisePickerItem(classKey, afterExerciseId, exerciseName) {
    const pickerKey = getExercisePickerKey(classKey, afterExerciseId);
    setExercisePickers(prev => {
      const current = prev[pickerKey] || {};
      return {
        ...prev,
        [pickerKey]: {
          search: "",
          muscleGroup: "",
          equipment: "",
          sets: "3",
          reps: "10",
          weight: "",
          rest: "60s",
          notes: "",
          ...current,
          selectedNames: toggleExercisePickerSelection(current.selectedNames || [], exerciseName)
        }
      };
    });
  }

  function addSelectedExercisesFromPicker(classKey, activeWorkout, afterExerciseId, groupType = "") {
    const pickerKey = getExercisePickerKey(classKey, afterExerciseId);
    const picker = exercisePickers[pickerKey] || {};
    const selectedNames = picker.selectedNames || [];
    if (selectedNames.length === 0) return;

    const exercisesToAdd = selectedNames.map(name => {
      const libraryExercise = EXERCISE_LIBRARY.find(item => item.name === name) || { name };
      return {
        ...libraryExercise,
        sets: picker.sets || "3",
        reps: picker.reps || "10",
        weight: picker.weight || "",
        rest: picker.rest || "",
        notes: picker.notes || ""
      };
    });

    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => addExecutedExercises(
      executedWorkout,
      exercisesToAdd,
      { afterExerciseId, groupType: groupType && selectedNames.length >= 2 ? groupType : "" }
    ));

    setExercisePickers(prev => ({
      ...prev,
      [pickerKey]: {
        selectedNames: [],
        search: "",
        muscleGroup: "",
        equipment: "",
        sets: "3",
        reps: "10",
        weight: "",
        rest: "60s",
        notes: ""
      }
    }));
  }

  function createExerciseGroupFromIndex(classKey, activeWorkout, sessionWorkout, exerciseIndex, groupType = "biset", count = 2) {
    const exerciseIds = getExerciseGroupCandidateIds(sessionWorkout.exercises || [], exerciseIndex, count);
    if (exerciseIds.length < count) {
      window.alert(groupType === "superset"
        ? "Selecione um exercicio que tenha pelo menos dois proximos exercicios para criar uma superserie."
        : "Selecione um exercicio que tenha um proximo exercicio para criar um biset.");
      return;
    }
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => createExerciseGroup(
      executedWorkout,
      exerciseIds,
      { type: groupType }
    ));
  }

  function removeBisetForExercise(classKey, activeWorkout, sessionWorkout, exerciseId) {
    const group = (sessionWorkout.groups || []).find(item => item.exerciseIds?.includes(exerciseId));
    if (!group) return;
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => removeBisetGroup(executedWorkout, group.id));
  }

  function moveExerciseInsideGroup(classKey, activeWorkout, group, exerciseId, direction) {
    const exerciseIds = [...(group.exerciseIds || [])];
    const index = exerciseIds.indexOf(exerciseId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= exerciseIds.length) return;
    const [item] = exerciseIds.splice(index, 1);
    exerciseIds.splice(nextIndex, 0, item);
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => reorderExerciseGroup(executedWorkout, group.id, exerciseIds));
  }

  function updateExecutedDropStep(classKey, activeWorkout, exerciseId, seriesId, stepId, patch) {
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => updateDropSetStep(
      executedWorkout,
      exerciseId,
      seriesId,
      stepId,
      patch
    ));
  }

  function removeExecutedDropStep(classKey, activeWorkout, exerciseId, seriesId, stepId) {
    updateExecutedWorkout(classKey, activeWorkout, executedWorkout => removeDropSetStep(
      executedWorkout,
      exerciseId,
      seriesId,
      stepId
    ));
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
            const sessionWorkout = draft.executedWorkout || (activeWorkout ? ensureExecutedWorkout(null, activeWorkout) : null);
            const sessionExercises = (sessionWorkout?.exercises || activeWorkout?.exercises || []).map((exercise, exerciseIndex) => {
              const groupIndex = (sessionWorkout?.groups || []).findIndex(group => group.exerciseIds?.includes(exercise.executionId || `exercise-${exerciseIndex}`));
              if (groupIndex < 0) return exercise;
              const group = sessionWorkout.groups[groupIndex];
              return {
                ...exercise,
                groupName: getExerciseGroupLabel(group, groupIndex),
                groupType: group.type || "biset"
              };
            });
            const sessionExerciseBlocks = buildSessionExerciseGroupBlocks({
              exercises: sessionExercises,
              groups: sessionWorkout?.groups || []
            });
            const centerSummary = buildSessionClassCenterSummary({
              workout: sessionWorkout || activeWorkout,
              draft,
              record,
              studentSummary
            });
            const executionPanel = activeWorkout
              ? buildSessionExecutionPanel({ workout: sessionWorkout || activeWorkout, draft })
              : null;
            const isActiveClass = activeClassKey === classKey;

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
              <div key={classKey} className={`session-student-card session-student-card-center ${hasNotes ? "session-student-card-active" : ""} ${isActiveClass ? "session-student-card-selected" : ""}`}>
                <div className="session-student-header">
                  <div style={{ minWidth: 0 }}>
                    <div className="session-student-title-row">
                      <div>
                        <h3 className="session-student-name">{cls.studentName}</h3>
                        <p className="session-student-meta">
                          {cls.time} {cls.scheduleTypeLabel ? `- ${cls.scheduleTypeLabel}` : ""}
                        </p>
                      </div>
                      <span className={`session-student-status-pill session-student-status-${centerSummary.statusLabel.toLowerCase().replace(/\s+/g, "-")}`}>
                        {centerSummary.statusLabel}
                      </span>
                    </div>
                    <p className="session-student-place">{cls.location || student?.location || "Sem local"}</p>
                    <div className="session-center-summary-grid">
                      <div>
                        <span>Treino</span>
                        <strong>{centerSummary.workoutName}</strong>
                      </div>
                      <div>
                        <span>Exercicio atual</span>
                        <strong>{centerSummary.currentExerciseName}</strong>
                      </div>
                      <div>
                        <span>Progresso</span>
                        <strong>{centerSummary.progressLabel}</strong>
                      </div>
                    </div>
                    {centerSummary.alerts.length > 0 && (
                      <div className="session-center-alerts">
                        {centerSummary.alerts.map(alert => (
                          <span key={alert}>{alert}</span>
                        ))}
                      </div>
                    )}
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
                    {!isActiveClass && (
                      <button
                        type="button"
                        onClick={() => setActiveClassKey(classKey)}
                        className="session-action-primary"
                        style={{ background: theme.primary, color: "#142339" }}
                      >
                        Abrir
                      </button>
                    )}
                    {isActiveClass && (
                      <>
                        <button
                          onClick={() => markPresent(classKey)}
                          disabled={saving}
                          className="session-action-primary"
                          style={{ opacity: saving ? 0.65 : 1, background: record?.status === "present" ? "rgba(242, 207, 124, 0.14)" : theme.primary, color: record?.status === "present" ? "#F2CF7C" : "#142339" }}
                        >
                          <IconCheck /> {record?.status === "present" ? "Presente" : "Marcar"}
                        </button>
                        <button
                          onClick={() => markAbsent(classKey, cls)}
                          disabled={saving}
                          className="session-action-danger"
                          style={{ opacity: saving ? 0.65 : 1, background: record?.status === "absent" ? "#fee2e2" : "white" }}
                        >
                          Falta
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isActiveClass && (
                  <>
                <SessionFlowSection section={beforeSection}>
                  <SessionStudentSummaryPanel summary={studentSummary} />
                  {replacementFlow?.classKey === classKey && (
                    <ReplacementFlow
                      student={replacementFlow.student}
                      missedClass={replacementFlow.missedClass}
                      selectedDate={selectedDate}
                      theme={theme}
                      onClose={() => setReplacementFlow(null)}
                      onSaveReason={(reason) => saveAbsenceReason(classKey, reason)}
                      onSaveReplacement={(payload) => saveReplacement({
                        student: replacementFlow.student,
                        cls: replacementFlow.cls,
                        ...payload
                      })}
                    />
                  )}
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
                        <p className="session-workout-name">{sessionWorkout?.name || activeWorkout.name}</p>
                        <p className="session-workout-count">{(sessionWorkout?.exercises || activeWorkout.exercises || []).length} exercícios executados</p>
                      </div>
                      <button
                        onClick={() => editingWorkout ? setEditingWorkoutKey(null) : startEditWorkoutFromClass(classKey, activeWorkout)}
                        className="session-action-muted"
                        style={{ flexShrink: 0 }}
                      >
                        {editingWorkout ? "Fechar edição" : "Editar treino"}
                      </button>
                    </div>

                    {!editingWorkout && <div className="session-exercise-list session-exercise-list-compact">
                      {executionPanel && (
                        <div className="session-current-set-panel">
                          <div className="session-current-set-header">
                            <div>
                              <span>{executionPanel.groupLabel || "Execucao agora"}</span>
                              <strong>{executionPanel.exerciseName}</strong>
                              <small>{executionPanel.seriesTitle} · {executionPanel.exerciseProgressLabel}</small>
                            </div>
                            <div className="session-current-set-tools">
                              <span>{executionPanel.workoutProgressLabel}</span>
                              {!executionPanel.isGroupSet && (
                                <button
                                  type="button"
                                  className="session-set-menu-button"
                                  onClick={() => toggleSetActionMenu(classKey, executionPanel.exerciseId, executionPanel.setKey)}
                                  aria-label="Acoes da serie atual"
                                >
                                  ...
                                </button>
                              )}
                              {!executionPanel.isGroupSet && setActionMenus[`${classKey}-${executionPanel.exerciseId}-${executionPanel.setKey}`] && (
                                <div className="session-set-menu session-current-set-menu">
                                  <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, "drop-set")}>
                                    <strong>Adicionar drop set</strong>
                                    <small>Somente nesta serie</small>
                                  </button>
                                  <button type="button" onClick={() => createExerciseGroupFromIndex(classKey, activeWorkout, sessionWorkout, executionPanel.exerciseIndex, "biset", 2)}>
                                    <strong>Criar biset</strong>
                                    <small>Com o proximo exercicio</small>
                                  </button>
                                  <button type="button" onClick={() => createExerciseGroupFromIndex(classKey, activeWorkout, sessionWorkout, executionPanel.exerciseIndex, "superset", 3)}>
                                    <strong>Criar superserie</strong>
                                    <small>Com os dois proximos exercicios</small>
                                  </button>
                                  {executionPanel.isDropSet && (
                                    <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, "undo-drop-set")}>
                                      <strong>Desfazer drop set</strong>
                                      <small>Preserva as etapas preenchidas</small>
                                    </button>
                                  )}
                                  <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, "duplicate-set")}>
                                    <strong>Duplicar serie</strong>
                                    <small>Copia o padrao desta serie</small>
                                  </button>
                                  <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, "warmup")}>
                                    <strong>Marcar aquecimento</strong>
                                    <small>Mantem os dados da serie</small>
                                  </button>
                                  <button type="button" onClick={() => updateExecutedSetNote(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, "")}>
                                    <strong>Adicionar observacao</strong>
                                    <small>Nota rapida da serie</small>
                                  </button>
                                  <button
                                    type="button"
                                    className="session-set-menu-danger"
                                    onClick={() => removeExecutedSetFromClass(classKey, activeWorkout, sessionWorkout, draft, executionPanel.exerciseIndex, executionPanel.exerciseId, executionPanel.setKey)}
                                  >
                                    <strong>Remover serie</strong>
                                    <small>Pede confirmacao se houver dados</small>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {executionPanel.isGroupSet && (
                            <div className={`session-current-biset-panel ${executionPanel.groupType === "superset" ? "session-current-biset-panel-superset" : ""}`}>
                              <div className="session-current-biset-title">
                                <strong>{executionPanel.groupLabel} · {executionPanel.seriesTitle}</strong>
                                <span>{executionPanel.groupProgressLabel}</span>
                              </div>
                              <div className="session-current-biset-entries">
                                {executionPanel.groupSetEntries.map((entry, entryIndex) => (
                                  <div className="session-current-biset-entry" key={entry.entryId}>
                                    <div className="session-current-biset-entry-title">
                                      <span>{entryIndex + 1}. {entry.exerciseName}</span>
                                      {entry.noSeries && <small>Sem serie nesta rodada</small>}
                                    </div>
                                    {!entry.noSeries && (
                                      <div className="session-current-biset-fields">
                                        <label className="session-current-set-field">
                                          <span>Carga</span>
                                          <div>
                                            <button
                                              type="button"
                                              onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "weightDone", -2.5, { entryId: entry.entryId }))}
                                              aria-label={`Diminuir carga de ${entry.exerciseName}`}
                                            >
                                              -
                                            </button>
                                            <input
                                              type="text"
                                              value={entry.weightValue}
                                              onChange={(event) => updateDraft(classKey, current => updateCurrentSessionSetValue(current, executionPanel, "weightDone", event.target.value, { entryId: entry.entryId }))}
                                              placeholder={entry.weightPlaceholder}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "weightDone", 2.5, { entryId: entry.entryId }))}
                                              aria-label={`Aumentar carga de ${entry.exerciseName}`}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </label>
                                        <label className="session-current-set-field">
                                          <span>Reps</span>
                                          <div>
                                            <button
                                              type="button"
                                              onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "repsDone", -1, { entryId: entry.entryId }))}
                                              aria-label={`Diminuir repeticoes de ${entry.exerciseName}`}
                                            >
                                              -
                                            </button>
                                            <input
                                              type="text"
                                              value={entry.repsValue}
                                              onChange={(event) => updateDraft(classKey, current => updateCurrentSessionSetValue(current, executionPanel, "repsDone", event.target.value, { entryId: entry.entryId }))}
                                              placeholder={entry.repsPlaceholder}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "repsDone", 1, { entryId: entry.entryId }))}
                                              aria-label={`Aumentar repeticoes de ${entry.exerciseName}`}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="session-current-set-footer">
                                <span>{executionPanel.groupProgressLabel}</span>
                                <button
                                  type="button"
                                  className="session-action-primary"
                                  disabled={!executionPanel.canComplete}
                                  onClick={() => updateDraft(classKey, current => completeCurrentSessionSet(current, executionPanel))}
                                >
                                  {executionPanel.groupType === "superset" ? "Completar superserie" : "Completar biset"}
                                </button>
                              </div>
                            </div>
                          )}
                          {!executionPanel.isGroupSet && executionPanel.groupExercises?.length > 0 && (
                            <div className={`session-current-group-strip ${executionPanel.groupType === "superset" ? "session-current-group-strip-superset" : ""}`}>
                              {executionPanel.groupExercises.map(groupExercise => (
                                <span
                                  key={groupExercise.id}
                                  className={groupExercise.id === executionPanel.exerciseId ? "session-current-group-active" : ""}
                                >
                                  {groupExercise.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {!executionPanel.isGroupSet && (
                            <>
                          <div className="session-current-set-grid">
                            <label className="session-current-set-field">
                              <span>Carga</span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "weightDone", -2.5))}
                                  aria-label="Diminuir carga"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  value={executionPanel.weightValue}
                                  onChange={(event) => updateDraft(classKey, current => updateCurrentSessionSetValue(current, executionPanel, "weightDone", event.target.value))}
                                  placeholder={executionPanel.weightPlaceholder}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "weightDone", 2.5))}
                                  aria-label="Aumentar carga"
                                >
                                  +
                                </button>
                              </div>
                            </label>
                            <label className="session-current-set-field">
                              <span>Repeticoes</span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "repsDone", -1))}
                                  aria-label="Diminuir repeticoes"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  value={executionPanel.repsValue}
                                  onChange={(event) => updateDraft(classKey, current => updateCurrentSessionSetValue(current, executionPanel, "repsDone", event.target.value))}
                                  placeholder={executionPanel.repsPlaceholder}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateDraft(classKey, current => stepCurrentSessionSetValue(current, executionPanel, "repsDone", 1))}
                                  aria-label="Aumentar repeticoes"
                                >
                                  +
                                </button>
                              </div>
                            </label>
                          </div>
                          {executionPanel.dropSteps?.length > 0 && (
                            <div className="session-current-drop-summary">
                              {executionPanel.dropSteps.map(step => (
                                <div className={step.completed ? "session-current-drop-step session-current-drop-step-done" : "session-current-drop-step"} key={step.id}>
                                  <span>{step.label}</span>
                                  <input
                                    type="text"
                                    value={step.weight || ""}
                                    onChange={(event) => updateExecutedDropStep(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, step.id, { weight: event.target.value })}
                                    placeholder="Carga"
                                  />
                                  <input
                                    type="text"
                                    value={step.reps || ""}
                                    onChange={(event) => updateExecutedDropStep(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, step.id, { reps: event.target.value })}
                                    placeholder="Reps"
                                  />
                                  <button
                                    type="button"
                                    className={step.completed ? "session-drop-complete-button session-drop-complete-button-done" : "session-drop-complete-button"}
                                    onClick={() => updateExecutedDropStep(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, step.id, { completed: !step.completed })}
                                  >
                                    {step.completed ? "Concluida" : "Completar"}
                                  </button>
                                  {step.role !== "main" && (
                                    <button
                                      type="button"
                                      onClick={() => removeExecutedDropStep(classKey, activeWorkout, executionPanel.exerciseId, executionPanel.setKey, step.id)}
                                      aria-label="Remover etapa do drop set atual"
                                    >
                                      -
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="session-current-set-footer">
                            <span>Descanso: {executionPanel.restLabel}</span>
                            <button
                              type="button"
                              className="session-action-primary"
                              disabled={!executionPanel.canComplete}
                              onClick={() => updateDraft(classKey, current => completeCurrentSessionSet(current, executionPanel))}
                            >
                              Completar serie
                            </button>
                          </div>
                            </>
                          )}
                        </div>
                      )}
                      {buildSessionWorkoutRows({ exercises: sessionExercises, draft }).map(row => {
                        const { exercise, index } = row;
                        const expandedKey = `${classKey}-${index}`;
                        const isExpanded = !!expandedExercises[expandedKey];
                        const exerciseIdForGroup = exercise.executionId || `exercise-${index}`;
                        const exerciseGroup = (sessionWorkout?.groups || []).find(group => group.exerciseIds?.includes(exerciseIdForGroup));
                        const groupPosition = exerciseGroup ? exerciseGroup.exerciseIds.indexOf(exerciseIdForGroup) : -1;
                        const groupSize = exerciseGroup?.exerciseIds?.length || 0;
                        const groupExerciseNames = exerciseGroup
                          ? exerciseGroup.exerciseIds
                            .map(groupExerciseId => sessionExercises.find(item => (item.executionId || "") === groupExerciseId)?.name)
                            .filter(Boolean)
                          : [];
                        const pickerKey = getExercisePickerKey(classKey, exerciseIdForGroup);
                        const picker = exercisePickers[pickerKey] || { selectedNames: [], search: "", muscleGroup: "", equipment: "", sets: "3", reps: "10", weight: "", rest: "60s", notes: "" };
                        const pickerResults = filterExercisePickerLibrary(EXERCISE_LIBRARY, picker).slice(0, 8);
                        return (
                          <div key={`compact-${exercise.name}-${index}`} className={`session-exercise ${exerciseGroup ? "session-exercise-grouped" : ""} ${exerciseGroup && groupPosition === 0 ? "session-exercise-grouped-first" : ""} ${exerciseGroup && groupPosition > 0 && groupPosition < groupSize - 1 ? "session-exercise-grouped-middle" : ""} ${exerciseGroup && groupPosition === groupSize - 1 ? "session-exercise-grouped-last" : ""} ${exercise.groupType === "superset" ? "session-exercise-grouped-superset" : ""} ${isExpanded ? "session-exercise-expanded" : ""}`}>
                            {exerciseGroup && groupPosition === 0 && (
                              <div className="session-exercise-group-header">
                                <div>
                                  <span>{getExerciseGroupLabel(exerciseGroup, (sessionWorkout?.groups || []).indexOf(exerciseGroup))}</span>
                                  <strong>{groupExerciseNames.join(" + ")}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeBisetForExercise(classKey, activeWorkout, sessionWorkout, exerciseIdForGroup)}
                                >
                                  Desfazer
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              className="session-exercise-summary"
                              onClick={() => toggleExerciseDetails(classKey, index)}
                            >
                              <span className="session-exercise-letter">{row.letter}</span>
                              <span className="session-exercise-copy">
                                <span className="session-exercise-name">{index + 1}. {exercise.name}</span>
                                <span className="session-exercise-prescription">{row.prescription}</span>
                                <span className="session-exercise-progress">{row.progressLabel}</span>
                                {(row.metaLabel || row.techniqueLabel || row.groupLabel) && (
                                  <span className="session-exercise-tags">
                                    {row.techniqueLabel && <span>{row.techniqueLabel}</span>}
                                    {row.groupLabel && <span>{row.groupLabel}</span>}
                                    {row.metaLabel && <span>{row.metaLabel}</span>}
                                  </span>
                                )}
                              </span>
                              <span className="session-exercise-toggle">{isExpanded ? "Fechar" : "Registrar"}</span>
                            </button>

                            {isExpanded && (
                              <div className="session-exercise-details">
                                {exercise.notes && <p className="session-exercise-note">{exercise.notes}</p>}
                                <div className="session-exercise-workbench">
                                  <div className="session-set-list session-set-card-list">
                                  {buildSessionSetRowsWithAdjustment({
                                    exercise,
                                    exerciseLog: draft.exerciseLogs?.[index],
                                    adjustment: exerciseAdjustments[expandedKey]
                                  }).map(setRow => {
                                    const setIndex = setRow.index;
                                    const exerciseId = exercise.executionId || `exercise-${index}`;
                                    const setActionMenuKey = `${classKey}-${exerciseId}-${setIndex}`;
                                    const isSetActionMenuOpen = !!setActionMenus[setActionMenuKey];
                                    return (
                                      <div className="session-set-card" key={setIndex}>
                                        <div className="session-set-card-header">
                                          <strong>{setRow.title}</strong>
                                          <div className="session-set-card-tools">
                                            <span className={setRow.typeLabel === "Drop set" ? "session-set-type-drop" : ""}>
                                              {setRow.typeLabel}
                                            </span>
                                            <button
                                              type="button"
                                              className="session-set-menu-button"
                                              onClick={() => toggleSetActionMenu(classKey, exerciseId, setIndex)}
                                              aria-label={`Acoes da ${setRow.title}`}
                                            >
                                              ...
                                            </button>
                                          </div>
                                          {isSetActionMenuOpen && (
                                            <div className="session-set-menu">
                                              <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "drop-set")}>
                                                <strong>Adicionar drop set</strong>
                                                <small>Somente nesta serie</small>
                                              </button>
                                              <button type="button" onClick={() => createExerciseGroupFromIndex(classKey, activeWorkout, sessionWorkout, index, "biset", 2)}>
                                                <strong>Criar biset com proximo</strong>
                                                <small>Agrupa dois exercicios</small>
                                              </button>
                                              <button type="button" onClick={() => createExerciseGroupFromIndex(classKey, activeWorkout, sessionWorkout, index, "superset", 3)}>
                                                <strong>Criar superserie</strong>
                                                <small>Agrupa tres exercicios</small>
                                              </button>
                                              <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "add-set")}>
                                                <strong>Adicionar serie</strong>
                                                <small>Copia o padrao anterior</small>
                                              </button>
                                              <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "duplicate-set")}>
                                                <strong>Duplicar serie</strong>
                                                <small>Copia esta serie</small>
                                              </button>
                                              <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "warmup")}>
                                                <strong>Marcar aquecimento</strong>
                                                <small>Somente nesta serie</small>
                                              </button>
                                              <button type="button" onClick={() => updateExecutedSetNote(classKey, activeWorkout, exerciseId, setIndex, setRow.note)}>
                                                <strong>Adicionar observacao</strong>
                                                <small>Nota rapida da serie</small>
                                              </button>
                                              <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "add-drop-step")}>
                                                <strong>Adicionar etapa drop</strong>
                                                <small>Dentro da mesma serie</small>
                                              </button>
                                              {setRow.typeLabel === "Drop set" && (
                                                <button type="button" onClick={() => applyExecutedSetAction(classKey, activeWorkout, exerciseId, setIndex, "undo-drop-set")}>
                                                  <strong>Desfazer drop set</strong>
                                                  <small>Mantem os dados preenchidos</small>
                                                </button>
                                              )}
                                              <button type="button" onClick={() => removeBisetForExercise(classKey, activeWorkout, sessionWorkout, exerciseId)}>
                                                <strong>Desfazer grupo</strong>
                                                <small>Mantem os exercicios</small>
                                              </button>
                                              {exerciseGroup && (
                                                <>
                                                  <button type="button" onClick={() => moveExerciseInsideGroup(classKey, activeWorkout, exerciseGroup, exerciseId, -1)}>
                                                    <strong>Mover acima no grupo</strong>
                                                    <small>Ajusta a ordem do bloco</small>
                                                  </button>
                                                  <button type="button" onClick={() => moveExerciseInsideGroup(classKey, activeWorkout, exerciseGroup, exerciseId, 1)}>
                                                    <strong>Mover abaixo no grupo</strong>
                                                    <small>Ajusta a ordem do bloco</small>
                                                  </button>
                                                </>
                                              )}
                                              <button
                                                type="button"
                                                className="session-set-menu-danger"
                                                onClick={() => removeExecutedSetFromClass(classKey, activeWorkout, sessionWorkout, draft, index, exerciseId, setIndex)}
                                              >
                                                <strong>Remover serie</strong>
                                                <small>Pede confirmacao se houver dados</small>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        {setRow.targetLabel && <p className="session-set-target">{setRow.targetLabel}</p>}
                                        {setRow.note && <p className="session-set-note">{setRow.note}</p>}
                                        <div className="session-set-card-grid">
                                          <label className="session-set-card-field">
                                            <span>Peso</span>
                                            <input
                                              type="text"
                                              value={setRow.weightValue}
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
                                              placeholder={setRow.weightPlaceholder}
                                              className="session-set-input"
                                            />
                                          </label>
                                          <label className="session-set-card-field">
                                            <span>Reps</span>
                                          <input
                                            type="text"
                                            value={setRow.repsValue}
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
                                            placeholder={setRow.repsPlaceholder}
                                            className="session-set-input"
                                          />
                                          </label>
                                        </div>
                                        {setRow.dropSteps?.length > 0 && (
                                          <div className="session-drop-steps">
                                            {setRow.dropSteps.map((step, stepIndex) => (
                                              <div className="session-drop-step" key={step.id || stepIndex}>
                                                <strong>{step.label || (stepIndex === 0 ? "Serie principal" : `Drop ${stepIndex}`)}</strong>
                                                <input
                                                  type="text"
                                                  value={step.weight || ""}
                                                  onChange={(event) => updateExecutedDropStep(classKey, activeWorkout, exerciseId, setIndex, step.id, { weight: event.target.value })}
                                                  placeholder={setRow.weightPlaceholder || "Carga"}
                                                />
                                                <input
                                                  type="text"
                                                  value={step.reps || ""}
                                                  onChange={(event) => updateExecutedDropStep(classKey, activeWorkout, exerciseId, setIndex, step.id, { reps: event.target.value })}
                                                  placeholder={setRow.repsPlaceholder || "Reps"}
                                                />
                                                <button
                                                  type="button"
                                                  className={step.completed ? "session-drop-complete-button session-drop-complete-button-done" : "session-drop-complete-button"}
                                                  onClick={() => updateExecutedDropStep(classKey, activeWorkout, exerciseId, setIndex, step.id, { completed: !step.completed })}
                                                >
                                                  {step.completed ? "Concluida" : "Completar"}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => removeExecutedDropStep(classKey, activeWorkout, exerciseId, setIndex, step.id)}
                                                  aria-label="Remover etapa do drop set"
                                                >
                                                  -
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  </div>
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
                                <div className="session-exercise-quick-actions">
                                  {EXERCISE_QUICK_ACTIONS.map(action => (
                                    <button
                                      key={action.id}
                                      type="button"
                                      onClick={() => applyExerciseQuickAction(classKey, index, action.id)}
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="session-add-exercise-form session-exercise-picker">
                                  <strong>Adicionar exercicio abaixo</strong>
                                  <div className="session-exercise-picker-search">
                                    <input
                                      type="text"
                                      value={picker.search || ""}
                                      onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { search: event.target.value })}
                                      placeholder="Buscar exercicio"
                                    />
                                    <select
                                      value={picker.muscleGroup || ""}
                                      onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { muscleGroup: event.target.value })}
                                    >
                                      <option value="">Todos os musculos</option>
                                      {exercisePickerFilters.muscleGroups.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={picker.equipment || ""}
                                      onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { equipment: event.target.value })}
                                    >
                                      <option value="">Todos equipamentos</option>
                                      {exercisePickerFilters.equipment.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="session-exercise-picker-list">
                                    {pickerResults.map(option => {
                                      const selected = (picker.selectedNames || []).includes(option.name);
                                      return (
                                        <button
                                          key={option.name}
                                          type="button"
                                          className={selected ? "session-exercise-picker-item session-exercise-picker-item-selected" : "session-exercise-picker-item"}
                                          onClick={() => toggleExercisePickerItem(classKey, exerciseIdForGroup, option.name)}
                                        >
                                          <span>{option.name}</span>
                                          <small>{[option.muscleGroup, option.equipment].filter(Boolean).join(" / ")}</small>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="session-add-exercise-grid session-exercise-picker-config">
                                    <input type="text" value={picker.sets || ""} onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { sets: event.target.value })} placeholder="Series" />
                                    <input type="text" value={picker.reps || ""} onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { reps: event.target.value })} placeholder="Reps" />
                                    <input type="text" value={picker.weight || ""} onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { weight: event.target.value })} placeholder="Carga" />
                                    <input type="text" value={picker.rest || ""} onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { rest: event.target.value })} placeholder="Descanso" />
                                  </div>
                                  <input
                                    type="text"
                                    value={picker.notes || ""}
                                    onChange={(event) => updateExercisePicker(classKey, exerciseIdForGroup, { notes: event.target.value })}
                                    placeholder="Observacao para os exercicios adicionados"
                                  />
                                  <div className="session-exercise-picker-actions">
                                    <button
                                      type="button"
                                      className="session-action-muted"
                                      disabled={(picker.selectedNames || []).length === 0}
                                      onClick={() => addSelectedExercisesFromPicker(classKey, activeWorkout, exerciseIdForGroup)}
                                    >
                                      Adicionar exercicio
                                    </button>
                                    <button
                                      type="button"
                                      className="session-action-primary"
                                      disabled={(picker.selectedNames || []).length < 2}
                                      onClick={() => addSelectedExercisesFromPicker(classKey, activeWorkout, exerciseIdForGroup, (picker.selectedNames || []).length > 2 ? "superset" : "biset")}
                                    >
                                      Adicionar como {(picker.selectedNames || []).length > 2 ? "superserie" : "biset"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>}

                    {!editingWorkout && <div className="session-exercise-list session-exercise-list-legacy-hidden">
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
                          <div className="session-exercise-quick-actions">
                            {EXERCISE_QUICK_ACTIONS.map(action => (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => applyExerciseQuickAction(classKey, index, action.id)}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>}

                    {editingWorkout && (
                      <div className="session-workout-builder">
                        <div className="session-builder-intro">
                          <strong>Montagem do treino</strong>
                          <span>Edite a lista completa, marque drop set, biset ou supersérie e mantenha tudo visível na aula.</span>
                        </div>
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
                          <div key={index} className="session-builder-exercise">
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
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                              <select
                                value={exercise.technique || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { technique: event.target.value })}
                                style={{ padding: "7px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }}
                                aria-label="Tipo do exercÃ­cio"
                              >
                                <option value="">ExercÃ­cio normal</option>
                                <option value="drop-set">Drop set</option>
                                <option value="biset">Biset</option>
                                <option value="superset">SupersÃ©rie</option>
                              </select>
                              <input
                                type="text"
                                value={exercise.groupName || ""}
                                onChange={(event) => updateWorkoutExercise(classKey, index, { groupName: event.target.value })}
                                placeholder="Grupo: A, Biset 1..."
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

                <div className="session-checkout-grid">
                  <label className="session-checkout-field">
                    <span>Esforco</span>
                    <select
                      value={draft.sessionCheckout?.effort || ""}
                      onChange={(event) => updateDraft(classKey, current => ({
                        ...current,
                        sessionCheckout: {
                          ...(current.sessionCheckout || {}),
                          effort: event.target.value
                        }
                      }))}
                    >
                      <option value="">Selecionar</option>
                      <option value="Leve">Leve</option>
                      <option value="Moderado">Moderado</option>
                      <option value="Intenso">Intenso</option>
                    </select>
                  </label>
                  <label className="session-checkout-field">
                    <span>Dor ou limitacao</span>
                    <input
                      type="text"
                      value={draft.sessionCheckout?.pain || ""}
                      onChange={(event) => updateDraft(classKey, current => ({
                        ...current,
                        sessionCheckout: {
                          ...(current.sessionCheckout || {}),
                          pain: event.target.value
                        }
                      }))}
                      placeholder="Ex: sem dor, ombro leve..."
                    />
                  </label>
                  <label className="session-checkout-field">
                    <span>Evolucao de carga</span>
                    <input
                      type="text"
                      value={draft.sessionCheckout?.loadProgress || ""}
                      onChange={(event) => updateDraft(classKey, current => ({
                        ...current,
                        sessionCheckout: {
                          ...(current.sessionCheckout || {}),
                          loadProgress: event.target.value
                        }
                      }))}
                      placeholder="Ex: subiu carga no leg press"
                    />
                  </label>
                  <label className="session-checkout-field">
                    <span>Proxima acao</span>
                    <input
                      type="text"
                      value={draft.sessionCheckout?.nextAction || ""}
                      onChange={(event) => updateDraft(classKey, current => ({
                        ...current,
                        sessionCheckout: {
                          ...(current.sessionCheckout || {}),
                          nextAction: event.target.value
                        }
                      }))}
                      placeholder="Ex: revisar posterior"
                    />
                  </label>
                </div>

                {sessionExerciseBlocks.some(block => block.type === "group") && (
                  <div className="session-executed-groups-summary">
                    <span>Agrupamentos executados</span>
                    {sessionExerciseBlocks.filter(block => block.type === "group").map(block => (
                      <div key={block.id}>
                        <strong>{block.label}</strong>
                        <small>{block.exercises.map(exercise => exercise.name).join(" + ")}</small>
                      </div>
                    ))}
                  </div>
                )}

                <div className="session-save-row" style={{ gridTemplateColumns: activeWorkout ? undefined : "1fr" }}>
                  <button
                    onClick={() => saveSessionNotes(classKey, activeWorkout)}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { SessionTab };
