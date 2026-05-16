import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc
} from '../../firebase';
import { DAYS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import { formatDate, formatDateISO, getDaysInMonth, parseBrazilianDate } from '../../lib/dates';
import { DEMO_EMAIL, getDemoWorkoutPlans } from '../../services/demoData';
import {
  BILLING_TYPES,
  calculateBillingStatus,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';
import { getStudentsEmptyState } from '../emptyStates/setupEmptyStates';
import { EXERCISE_LIBRARY, WORKOUT_TEMPLATES } from '../workouts/workoutPresets';
import {
  buildWorkoutModelFromPlan,
  cloneModelToWorkoutPlan,
  getSystemWorkoutModels,
  normalizeWorkoutModel
} from '../workouts/workoutModelUtils';
import { DataTabContent } from './StudentProfileDataTab';
import { StudentProfileSummaryTab } from './StudentProfileSummaryTab';

function IconPlus() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;
}

function IconTrash() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
}

function IconEdit() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
}

function IconArrowLeft() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
}

function IconUser() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function IconRuler() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><line x1="12" x2="12" y1="7" y2="17"/></svg>;
}

function IconDumbbell() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v4H6z"/><path d="M4 8h16v8H4z"/><path d="M6 16h12v4H6z"/></svg>;
}

function IconCopy() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/></svg>;
}

function IconHistory() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>;
}

const DEFAULT_ANAMNESIS = {
  goal: "",
  trainingHistory: "",
  injuries: "",
  restrictions: "",
  conditions: "",
  medications: "",
  sleep: "",
  nutrition: "",
  availability: "",
  notes: ""
};

function getRecordParts(recordKey) {
  const [date, studentId, ...timeParts] = recordKey.split("_");
  return {
    date,
    studentId,
    time: timeParts.join("_")
  };
}

function getSafeImageUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function parseISODate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getCurrentMonthPeriod() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth(), getDaysInMonth(today.getFullYear(), today.getMonth()));

  return {
    start: formatDateISO(firstDay),
    end: formatDateISO(lastDay)
  };
}

function getStudentScheduleDayIndex(date) {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
}

function countScheduledClassesBetween(schedule, startISO, endISO) {
  const startDate = parseISODate(startISO);
  const endDate = parseISODate(endISO);
  if (!startDate || !endDate || endDate < startDate) return 0;

  const scheduledSlotsByDay = schedule.reduce((acc, item) => {
    const day = Number(item.day);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  let total = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    total += scheduledSlotsByDay[getStudentScheduleDayIndex(cursor)] || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

// ==================== STUDENT PROFILE ====================
function StudentProfile({ studentId, student, records, onBack, onEdit, theme }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("resumo");
  const [measurements, setMeasurements] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [anamnesis, setAnamnesis] = useState(DEFAULT_ANAMNESIS);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [showNewPhoto, setShowNewPhoto] = useState(false);
  const [expandedMeasurement, setExpandedMeasurement] = useState(null);
  const [expandedWorkout, setExpandedWorkout] = useState(null);

  useEffect(() => {
    if (!user || !studentId) return;
    loadProfileData();
  }, [studentId, user]);

  async function loadProfileData() {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const measurementsSnap = await getDocs(collection(db, `users/${user.uid}/students/${studentId}/measurements`));
      const measurementsData = measurementsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeasurements(measurementsData);

      const workoutSnap = await getDocs(collection(db, `users/${user.uid}/students/${studentId}/workoutPlans`));
      const workoutData = workoutSnap.empty && user.email === DEMO_EMAIL
        ? getDemoWorkoutPlans(studentId)
        : workoutSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => (b.active ? 1 : -1) - (a.active ? 1 : -1));
      setWorkoutPlans(workoutData);

      const anamnesisSnap = await getDoc(doc(db, `users/${user.uid}/students/${studentId}/profile/anamnesis`));
      setAnamnesis(anamnesisSnap.exists() ? { ...DEFAULT_ANAMNESIS, ...anamnesisSnap.data() } : DEFAULT_ANAMNESIS);

      const photosSnap = await getDocs(collection(db, `users/${user.uid}/students/${studentId}/progressPhotos`));
      const photosData = photosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setProgressPhotos(photosData);
    } catch (error) {
      console.error("Error loading profile:", error);
      if (user.email === DEMO_EMAIL) {
        setWorkoutPlans(getDemoWorkoutPlans(studentId));
        setAnamnesis({
          ...DEFAULT_ANAMNESIS,
          goal: "Hipertrofia com acompanhamento de carga.",
          trainingHistory: "Dados fictícios para demonstração.",
          notes: "Conta demo criada para testar o aplicativo."
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  const tabItems = [
    { id: "resumo", label: "Resumo", icon: <IconHistory /> },
    { id: "dados", label: "Dados", icon: <IconUser /> },
    { id: "anamnese", label: "Anamnese", icon: <IconUser /> },
    { id: "medidas", label: "Medidas", icon: <IconRuler /> },
    { id: "fotos", label: "Fotos", icon: <IconRuler /> },
    { id: "treinos", label: "Treinos", icon: <IconDumbbell /> },
    { id: "historico", label: "Histórico", icon: <IconHistory /> }
  ];

  return (
    <div className="student-profile-page" style={{ padding: "16px" }}>
      <button
        onClick={onBack}
        className="student-profile-back"
        style={{
          padding: "8px 12px",
          background: "none",
          border: "none",
          color: theme.primary,
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "16px"
        }}
      >
        <IconArrowLeft /> Voltar
      </button>

      <section className="student-profile-hero">
        <p className="dashboard-kicker">PERFIL DO ALUNO</p>
        <h2>{student.name}</h2>
        <div className="student-profile-contact">
          {student.email && <span>E-mail: {student.email}</span>}
          {student.phone && <span>WhatsApp: {student.phone}</span>}
        </div>
      </section>

      <div className="student-profile-tabs" style={{ display: "flex", gap: "16px", marginBottom: "16px", borderBottom: `2px solid #e5e7eb` }}>
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "student-profile-tab-active" : ""}
            style={{
              padding: "12px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: activeTab === tab.id ? theme.primary : "#9ca3af",
              borderBottom: activeTab === tab.id ? `3px solid ${theme.primary}` : "none",
              marginBottom: "-2px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ fontSize: "16px" }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {loadingProfile && <p style={{ color: "#91A0B6", textAlign: "center" }}>Carregando...</p>}

      {activeTab === "resumo" && (
        <StudentProfileSummaryTab
          student={student}
          records={records}
          workoutPlans={workoutPlans}
          anamnesis={anamnesis}
          theme={theme}
          onEdit={() => onEdit(student)}
          onOpenWorkout={() => setActiveTab("treinos")}
        />
      )}
      {activeTab === "dados" && <DataTabContent student={student} records={records} onEdit={onEdit} theme={theme} />}
      {activeTab === "anamnese" && <AnamnesisTabContent studentId={studentId} anamnesis={anamnesis} setAnamnesis={setAnamnesis} theme={theme} />}
      {activeTab === "medidas" && <MeasurementsTabContent studentId={studentId} measurements={measurements} setMeasurements={setMeasurements} showNewMeasurement={showNewMeasurement} setShowNewMeasurement={setShowNewMeasurement} expandedMeasurement={expandedMeasurement} setExpandedMeasurement={setExpandedMeasurement} theme={theme} />}
      {activeTab === "fotos" && <ProgressPhotosTabContent studentId={studentId} photos={progressPhotos} setPhotos={setProgressPhotos} showNewPhoto={showNewPhoto} setShowNewPhoto={setShowNewPhoto} theme={theme} />}
      {activeTab === "treinos" && <WorkoutsTabContent studentId={studentId} workoutPlans={workoutPlans} setWorkoutPlans={setWorkoutPlans} showNewWorkout={showNewWorkout} setShowNewWorkout={setShowNewWorkout} expandedWorkout={expandedWorkout} setExpandedWorkout={setExpandedWorkout} theme={theme} />}
      {activeTab === "historico" && <ClassHistoryTabContent studentId={studentId} records={records} workoutPlans={workoutPlans} theme={theme} />}
    </div>
  );
}

function ClassHistoryTabContent({ studentId, records, workoutPlans, theme }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const studentRecords = records
    .filter(record => getRecordParts(record.key).studentId === studentId)
    .map(record => {
      const parts = getRecordParts(record.key);
      return {
        ...record,
        date: parts.date,
        time: parts.time,
        dateObj: parseBrazilianDate(parts.date)
      };
    })
    .sort((a, b) => {
      const dateDiff = b.dateObj - a.dateObj;
      if (dateDiff !== 0) return dateDiff;
      return b.time.localeCompare(a.time);
    });

  const workoutVersions = workoutPlans
    .filter(plan => plan.sourceClassKey || plan.previousWorkoutId || plan.updatedFromSessionAt)
    .sort((a, b) => String(b.updatedFromSessionAt || b.createdAt || "").localeCompare(String(a.updatedFromSessionAt || a.createdAt || "")));

  if (studentRecords.length === 0 && workoutVersions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", background: "#243B5C", borderRadius: "8px", color: "#91A0B6" }}>
        <p style={{ fontSize: "14px", margin: 0 }}>Nenhum histórico registrado para este aluno.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {workoutVersions.length > 0 && (
        <div style={{ background: "#243B5C", border: "1px solid #4A6388", borderRadius: "8px", padding: "12px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 8px 0" }}>Versões de treino recentes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {workoutVersions.slice(0, 5).map(plan => (
              <div key={plan.id} style={{ padding: "8px", background: "#243B5C", borderRadius: "6px", border: "1px solid #4A6388" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#FFFFFF", margin: "0 0 3px 0" }}>{plan.name}</p>
                <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                  {plan.updatedFromSessionAt ? `Criado a partir da aula de ${plan.updatedFromSessionAt}` : plan.updatedAt ? `Editado em ${plan.updatedAt}` : `Criado em ${plan.createdAt || "-"}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {studentRecords.map(record => {
          const isOpen = expandedKey === record.key;
          const exerciseEntries = Object.entries(record.exerciseNotes || {}).filter(([, note]) => String(note || "").trim());
          const hasDetails = record.sessionNote || record.activity || exerciseEntries.length > 0;
          const statusColors = record.status === "present"
            ? { background: "rgba(242, 207, 124, 0.14)", color: "#F2CF7C", label: "Presente" }
            : record.status === "absent"
            ? { background: "#fee2e2", color: "#dc2626", label: "Falta" }
            : { background: "#f3f4f6", color: "#6b7280", label: "Sem status" };

          return (
            <div key={record.key} style={{ background: "#243B5C", border: "1px solid #4A6388", borderRadius: "8px", padding: "12px" }}>
              <button
                onClick={() => setExpandedKey(isOpen ? null : record.key)}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 3px 0" }}>{record.date} - {record.time}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                      {hasDetails ? "Com anotações de aula" : "Sem anotações"}
                    </p>
                  </div>
                  <span style={{ flexShrink: 0, padding: "4px 8px", background: statusColors.background, color: statusColors.color, borderRadius: "4px", fontSize: "11px", fontWeight: "800" }}>
                    {statusColors.label}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f3f4f6" }}>
                  {record.activity && <p style={{ fontSize: "12px", color: "#C2CAD7", margin: "0 0 6px 0" }}><strong>Atividade:</strong> {record.activity}</p>}
                  {record.sessionNote && <p style={{ fontSize: "12px", color: "#C2CAD7", margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}><strong>Nota geral:</strong> {record.sessionNote}</p>}
                  {exerciseEntries.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <p style={{ fontSize: "11px", fontWeight: "800", color: theme.primary, margin: 0 }}>Alterações por exercício</p>
                      {exerciseEntries.map(([index, note]) => (
                        <div key={index} style={{ padding: "7px 8px", background: "#243B5C", borderRadius: "6px", fontSize: "12px", color: "#DCE7FF" }}>
                          Exercício {Number(index) + 1}: {note}
                        </div>
                      ))}
                    </div>
                  )}
                  {!hasDetails && <p style={{ fontSize: "12px", color: "#91A0B6", margin: 0 }}>Nenhum detalhe registrado nesta aula.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnamnesisTabContent({ studentId, anamnesis, setAnamnesis, theme }) {
  const { user } = useAuth();
  const [form, setForm] = useState(anamnesis || DEFAULT_ANAMNESIS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(anamnesis || DEFAULT_ANAMNESIS);
  }, [anamnesis]);

  const riskItems = [
    form.injuries?.trim() ? "Lesão registrada" : null,
    form.restrictions?.trim() ? "Restrição de treino" : null,
    form.conditions?.trim() ? "Condição de saúde" : null,
    form.medications?.trim() ? "Uso de medicamento" : null,
    form.availability?.trim() ? "Disponibilidade mapeada" : null
  ].filter(Boolean);

  async function saveAnamnesis() {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        updatedAt: formatDate(new Date())
      };
      await setDoc(doc(db, `users/${user.uid}/students/${studentId}/profile/anamnesis`), data, { merge: true });
      setAnamnesis(data);
    } catch (error) {
      console.error("Error saving anamnesis:", error);
      alert("Erro ao salvar anamnese");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "goal", label: "Objetivo principal", placeholder: "Ex: emagrecimento, hipertrofia, condicionamento..." },
    { key: "trainingHistory", label: "Histórico de treino", placeholder: "Tempo de treino, modalidades, rotina atual..." },
    { key: "injuries", label: "Lesões", placeholder: "Dores, cirurgias, lesões antigas ou atuais..." },
    { key: "restrictions", label: "Restrições", placeholder: "Movimentos proibidos, limitações, recomendações médicas..." },
    { key: "conditions", label: "Doenças/condições", placeholder: "Hipertensão, diabetes, problemas cardíacos..." },
    { key: "medications", label: "Medicamentos", placeholder: "Medicamentos em uso e frequência..." },
    { key: "sleep", label: "Sono", placeholder: "Horas por noite e qualidade do sono..." },
    { key: "nutrition", label: "Alimentação", placeholder: "Rotina alimentar, acompanhamento nutricional..." },
    { key: "availability", label: "Disponibilidade", placeholder: "Dias, horários e frequência possível..." },
    { key: "notes", label: "Observações gerais", placeholder: "Qualquer informação importante para acompanhamento..." }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ background: "#243B5C", padding: "12px", borderRadius: "12px", border: "1px solid #4A6388" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: "#C2CAD7", margin: "0 0 8px 0" }}>Resumo de risco</p>
        {riskItems.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#91A0B6", margin: "0" }}>Nenhum ponto sensível registrado.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {riskItems.map(item => (
              <span key={item} style={{ padding: "4px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>{item}</span>
            ))}
          </div>
        )}
      </div>

      {fields.map(field => (
        <div key={field.key}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>{field.label}</label>
          <textarea
            value={form[field.key] || ""}
            onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              boxSizing: "border-box",
              fontFamily: "inherit",
              minHeight: field.key === "notes" ? "74px" : "58px",
              resize: "vertical"
            }}
          />
        </div>
      ))}

      <button
        onClick={saveAnamnesis}
        disabled={saving}
        style={{
          padding: "10px 16px",
          background: saving ? "#d1d5db" : theme.primary,
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "700",
          cursor: saving ? "not-allowed" : "pointer"
        }}
      >
        {saving ? "Salvando..." : "Salvar anamnese"}
      </button>
    </div>
  );
}

function ProgressPhotosTabContent({ studentId, photos, setPhotos, showNewPhoto, setShowNewPhoto, theme }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: formatDateISO(new Date()), frontUrl: "", sideUrl: "", backUrl: "", notes: "" });

  async function savePhotoSet() {
    const frontUrl = getSafeImageUrl(form.frontUrl);
    const sideUrl = getSafeImageUrl(form.sideUrl);
    const backUrl = getSafeImageUrl(form.backUrl);
    if (!user || (!frontUrl && !sideUrl && !backUrl)) return;
    if ((form.frontUrl.trim() && !frontUrl) || (form.sideUrl.trim() && !sideUrl) || (form.backUrl.trim() && !backUrl)) {
      alert("Use apenas links de imagem HTTPS validos.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        date: form.date,
        frontUrl,
        sideUrl,
        backUrl,
        notes: form.notes.trim(),
        createdAt: formatDate(new Date())
      };
      const docRef = await addDoc(collection(db, `users/${user.uid}/students/${studentId}/progressPhotos`), data);
      setPhotos(prev => [{ id: docRef.id, ...data }, ...prev]);
      setForm({ date: formatDateISO(new Date()), frontUrl: "", sideUrl: "", backUrl: "", notes: "" });
      setShowNewPhoto(false);
    } catch (error) {
      console.error("Error saving progress photos:", error);
      alert("Erro ao salvar fotos");
    } finally {
      setSaving(false);
    }
  }

  async function deletePhotoSet(id) {
    if (!user || !window.confirm("Remover este registro de fotos?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/students/${studentId}/progressPhotos/${id}`));
      setPhotos(prev => prev.filter(photo => photo.id !== id));
    } catch (error) {
      console.error("Error deleting progress photos:", error);
      alert("Erro ao remover fotos");
    }
  }

  const photoFields = [
    { key: "frontUrl", label: "Foto frente" },
    { key: "sideUrl", label: "Foto lado" },
    { key: "backUrl", label: "Foto costas" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => setShowNewPhoto(!showNewPhoto)}
        style={{
          padding: "10px 16px",
          background: theme.primary,
          color: "#142339",
          border: "none",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "700",
          cursor: "pointer",
          display: "flex",
          justifyContent: "center"
        }}
      >
        Nova evolucao por fotos
      </button>

      {showNewPhoto && (
        <div style={{ background: "#243B5C", padding: "16px", borderRadius: "8px", border: `1px solid ${theme.light}` }}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
              style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>
          {photoFields.map(field => (
            <div key={field.key} style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>{field.label}</label>
              <input
                type="url"
                value={form[field.key]}
                onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="Cole o link da imagem"
                style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Observações sobre postura, medidas, aderência..."
            style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minHeight: "58px", resize: "vertical", marginBottom: "10px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={savePhotoSet}
              disabled={saving}
              style={{ flex: 1, padding: "9px", background: saving ? "#d1d5db" : theme.primary, color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer" }}
            >
              Salvar fotos
            </button>
            <button
              onClick={() => setShowNewPhoto(false)}
              style={{ padding: "9px 14px", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <p style={{ color: "#91A0B6", textAlign: "center", padding: "20px" }}>Nenhuma foto de evolucao cadastrada</p>
      ) : (
        <div className="students-list">
          {photos.map(photo => (
            <div key={photo.id} style={{ background: "#243B5C", border: "1px solid #4A6388", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#FFFFFF", margin: "0" }}>{new Date(photo.date).toLocaleDateString("pt-BR")}</p>
                  {photo.notes && <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>{photo.notes}</p>}
                </div>
                <button onClick={() => deletePhotoSet(photo.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "4px", padding: "5px 8px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Remover</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {photoFields.map(field => (
                  <div key={field.key} style={{ background: "#243B5C", borderRadius: "6px", overflow: "hidden", border: "1px solid #4A6388" }}>
                    <p style={{ fontSize: "10px", fontWeight: "700", color: "#6b7280", margin: "0", padding: "6px" }}>{field.label}</p>
                    {getSafeImageUrl(photo[field.key]) ? (
                      <img src={getSafeImageUrl(photo[field.key])} alt={field.label} referrerPolicy="no-referrer" loading="lazy" style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ aspectRatio: "3 / 4", display: "flex", alignItems: "center", justifyContent: "center", color: "#91A0B6", fontSize: "11px" }}>Sem foto</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeasurementsTabContent({ studentId, measurements, setMeasurements, showNewMeasurement, setShowNewMeasurement, expandedMeasurement, setExpandedMeasurement, theme }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ date: formatDate(new Date()).split("/").reverse().join("-"), peso: "", altura: "", peitoral: "", cintura: "", quadril: "", bracoD: "", bracoE: "", coxaD: "", coxaE: "", panturrilhaD: "", panturrilhaE: "", gordura: "" });

  function calculateIMC(peso, altura) {
    if (!peso || !altura) return null;
    return (peso / (altura / 100) ** 2).toFixed(2);
  }

  async function saveMeasurement() {
    if (!formData.date || !formData.peso || !formData.altura) return;
    if (!user) return;
    setSaving(true);

    try {
      const data = {
        date: formData.date,
        peso: parseFloat(formData.peso),
        altura: parseFloat(formData.altura),
        imc: parseFloat(calculateIMC(formData.peso, formData.altura)),
        peitoral: formData.peitoral ? parseFloat(formData.peitoral) : null,
        cintura: formData.cintura ? parseFloat(formData.cintura) : null,
        quadril: formData.quadril ? parseFloat(formData.quadril) : null,
        bracoD: formData.bracoD ? parseFloat(formData.bracoD) : null,
        bracoE: formData.bracoE ? parseFloat(formData.bracoE) : null,
        coxaD: formData.coxaD ? parseFloat(formData.coxaD) : null,
        coxaE: formData.coxaE ? parseFloat(formData.coxaE) : null,
        panturrilhaD: formData.panturrilhaD ? parseFloat(formData.panturrilhaD) : null,
        panturrilhaE: formData.panturrilhaE ? parseFloat(formData.panturrilhaE) : null,
        gordura: formData.gordura ? parseFloat(formData.gordura) : null
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/students/${studentId}/measurements`), data);
      setMeasurements(prev => [{ id: docRef.id, ...data }, ...prev]);
      setFormData({ date: formatDate(new Date()).split("/").reverse().join("-"), peso: "", altura: "", peitoral: "", cintura: "", quadril: "", bracoD: "", bracoE: "", coxaD: "", coxaE: "", panturrilhaD: "", panturrilhaE: "", gordura: "" });
      setShowNewMeasurement(false);
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert("Erro ao salvar medição");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => setShowNewMeasurement(!showNewMeasurement)}
        style={{
          padding: "10px 16px",
          background: theme.primary,
          color: "#142339",
          border: "none",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <IconPlus /> Nova Medição
      </button>

      {showNewMeasurement && (
        <div style={{ background: "#243B5C", padding: "16px", borderRadius: "8px", border: `1px solid ${theme.light}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
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
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Peso (kg)</label>
              <input
                type="number"
                value={formData.peso}
                onChange={(e) => setFormData(f => ({ ...f, peso: e.target.value }))}
                placeholder="70"
                step="0.1"
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
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Altura (cm)</label>
              <input
                type="number"
                value={formData.altura}
                onChange={(e) => setFormData(f => ({ ...f, altura: e.target.value }))}
                placeholder="170"
                step="0.1"
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
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>IMC (auto)</label>
              <input
                type="text"
                value={calculateIMC(formData.peso, formData.altura) || ""}
                readOnly
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  background: "#f3f4f6"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Peitoral (cm)</label>
              <input type="number" value={formData.peitoral} onChange={(e) => setFormData(f => ({ ...f, peitoral: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Cintura (cm)</label>
              <input type="number" value={formData.cintura} onChange={(e) => setFormData(f => ({ ...f, cintura: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Quadril (cm)</label>
              <input type="number" value={formData.quadril} onChange={(e) => setFormData(f => ({ ...f, quadril: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>% Gordura</label>
              <input type="number" value={formData.gordura} onChange={(e) => setFormData(f => ({ ...f, gordura: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Braço D (cm)</label>
              <input type="number" value={formData.bracoD} onChange={(e) => setFormData(f => ({ ...f, bracoD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Braço E (cm)</label>
              <input type="number" value={formData.bracoE} onChange={(e) => setFormData(f => ({ ...f, bracoE: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Coxa D (cm)</label>
              <input type="number" value={formData.coxaD} onChange={(e) => setFormData(f => ({ ...f, coxaD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Coxa E (cm)</label>
              <input type="number" value={formData.coxaE} onChange={(e) => setFormData(f => ({ ...f, coxaE: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Panturrilha D (cm)</label>
              <input type="number" value={formData.panturrilhaD} onChange={(e) => setFormData(f => ({ ...f, panturrilhaD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Panturrilha E (cm)</label>
              <input type="number" value={formData.panturrilhaE} onChange={(e) => setFormData(f => ({ ...f, panturrilhaE: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={saveMeasurement}
              disabled={saving || !formData.peso || !formData.altura}
              style={{
                flex: 1,
                padding: "8px",
                background: theme.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Salvar
            </button>
            <button
              onClick={() => setShowNewMeasurement(false)}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                color: "#6b7280",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {measurements.length === 0 ? (
        <p style={{ color: "#91A0B6", textAlign: "center", padding: "20px" }}>Nenhuma medição registrada</p>
      ) : (
        <div className="profile-plan-list">
          {measurements.map((m, idx) => {
            const prev = idx < measurements.length - 1 ? measurements[idx + 1] : null;
            const pesoChange = prev ? (m.peso - prev.peso) : null;
            const gorduraChange = prev ? (m.gordura - prev.gordura) : null;

            return (
              <div key={m.id} onClick={() => setExpandedMeasurement(expandedMeasurement === m.id ? null : m.id)} style={{
                background: "#243B5C",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #4A6388",
                cursor: "pointer"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: "600", color: "#FFFFFF", margin: "0" }}>{m.date}</p>
                    <p style={{ fontSize: "11px", color: "#91A0B6", margin: "4px 0 0 0" }}>Peso: {m.peso}kg | IMC: {m.imc}</p>
                    {m.gordura && <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0" }}>Gordura: {m.gordura}%</p>}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {pesoChange && <span style={{ fontSize: "14px", color: pesoChange < 0 ? "#F2CF7C" : "#dc2626" }}>{pesoChange < 0 ? "↓" : "↑"}</span>}
                    {gorduraChange && <span style={{ fontSize: "14px", color: gorduraChange < 0 ? "#F2CF7C" : "#dc2626" }}>{gorduraChange < 0 ? "↓" : "↑"}</span>}
                  </div>
                </div>

                {expandedMeasurement === m.id && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                    <p style={{ margin: "0" }}><strong>Peitoral:</strong> {m.peitoral ? `${m.peitoral}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Cintura:</strong> {m.cintura ? `${m.cintura}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Quadril:</strong> {m.quadril ? `${m.quadril}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Braço D:</strong> {m.bracoD ? `${m.bracoD}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Braço E:</strong> {m.bracoE ? `${m.bracoE}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Coxa D:</strong> {m.coxaD ? `${m.coxaD}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Coxa E:</strong> {m.coxaE ? `${m.coxaE}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Panturrilha D:</strong> {m.panturrilhaD ? `${m.panturrilhaD}cm` : "-"}</p>
                    <p style={{ margin: "0" }}><strong>Panturrilha E:</strong> {m.panturrilhaE ? `${m.panturrilhaE}cm` : "-"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkoutsTabContent({ studentId, workoutPlans, setWorkoutPlans, showNewWorkout, setShowNewWorkout, expandedWorkout, setExpandedWorkout, theme }) {
  const { user } = useAuth();
  const emptyExerciseForm = { name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "", type: "normal", imageUrl: "" };
  const [saving, setSaving] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [formData, setFormData] = useState({ name: "", active: true, startDate: formatDate(new Date()), exercises: [], days: [] });
  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);
  const [userWorkoutModels, setUserWorkoutModels] = useState([]);
  const [expandedWorkoutDay, setExpandedWorkoutDay] = useState(null);
  const [exerciseTargetDayIndex, setExerciseTargetDayIndex] = useState("");
  const [editingExerciseContext, setEditingExerciseContext] = useState(null);
  const [openPlanMenuId, setOpenPlanMenuId] = useState(null);
  const [openWorkoutActionMenu, setOpenWorkoutActionMenu] = useState(null);
  const [expandedExerciseEditorKey, setExpandedExerciseEditorKey] = useState(null);

  useEffect(() => {
    async function loadWorkoutModels() {
      if (!user) return;
      try {
        const snap = await getDocs(collection(db, `users/${user.uid}/workoutModels`));
        setUserWorkoutModels(snap.docs.map(item => normalizeWorkoutModel({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error("Error loading workout models:", error);
      }
    }

    loadWorkoutModels();
  }, [user]);

  const availableWorkoutModels = [
    ...getSystemWorkoutModels(),
    ...userWorkoutModels
  ];

  async function saveWorkout() {
    const planDays = normalizeWorkoutDays(formData);
    const hasContent = (formData.exercises || []).length > 0 || planDays.length > 0;
    if (!formData.name.trim() || !hasContent) return;
    if (!user) return;
    setSaving(true);

    try {
      const existingWorkout = editingWorkoutId ? workoutPlans.find(plan => plan.id === editingWorkoutId) : null;
      const data = {
        name: formData.name,
        createdAt: existingWorkout?.createdAt || formatDate(new Date()),
        startDate: formData.startDate || existingWorkout?.startDate || formatDate(new Date()),
        active: formData.active,
        status: formData.active ? "ativo" : (existingWorkout?.status || "rascunho"),
        exercises: formData.exercises,
        days: planDays.map((day, index) => ({
          ...day,
          dayNumber: index + 1
        }))
      };

      if (editingWorkoutId) {
        await updateDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${editingWorkoutId}`), {
          ...data,
          updatedAt: formatDate(new Date())
        });
        setWorkoutPlans(prev => prev.map(plan => plan.id === editingWorkoutId ? { ...plan, ...data, updatedAt: formatDate(new Date()) } : plan));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/students/${studentId}/workoutPlans`), data);
        setWorkoutPlans(prev => [{ id: docRef.id, ...data }, ...prev]);
      }
      resetWorkoutForm();
      setShowNewWorkout(false);
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("Erro ao salvar treino");
    } finally {
      setSaving(false);
    }
  }

  function resetWorkoutForm() {
    setEditingWorkoutId(null);
    setFormData({ name: "", active: true, startDate: formatDate(new Date()), exercises: [], days: [] });
    setExerciseForm(emptyExerciseForm);
    setExpandedWorkoutDay(null);
    setExerciseTargetDayIndex("");
    setEditingExerciseContext(null);
    setExpandedExerciseEditorKey(null);
    setOpenWorkoutActionMenu(null);
  }

  function startEditWorkout(plan) {
    setEditingWorkoutId(plan.id);
    setFormData({
      name: plan.name || "",
      active: plan.active !== false,
      startDate: plan.startDate || plan.createdAt || "",
      exercises: (plan.exercises || []).map(exercise => ({ ...exercise })),
      days: normalizeWorkoutDays(plan)
    });
    setExerciseForm(emptyExerciseForm);
    setShowNewWorkout(true);
    setExpandedWorkout(plan.id);
    setExpandedWorkoutDay(null);
    setExerciseTargetDayIndex("");
    setEditingExerciseContext(null);
    setExpandedExerciseEditorKey(null);
    setOpenWorkoutActionMenu(null);
  }

  function addExercise() {
    if (!exerciseForm.name.trim()) return;
    if (editingExerciseContext) {
      saveEditedExercise();
      return;
    }

    const newExercise = { ...exerciseForm, id: `exercise-${Date.now()}` };
    setFormData(f => {
      const days = normalizeWorkoutDays(f);
      const selectedDayIndex = Number(exerciseTargetDayIndex);
      const shouldAddToDay = exerciseTargetDayIndex !== "" && Number.isInteger(selectedDayIndex) && days[selectedDayIndex];

      return {
        ...f,
        exercises: [...(f.exercises || []), newExercise],
        days: shouldAddToDay
          ? days.map((day, dayIndex) => (
            dayIndex === selectedDayIndex
              ? { ...day, exercises: [...(day.exercises || []), newExercise] }
              : day
          ))
          : f.days
      };
    });
    resetExerciseEditor();
  }

  function applyTemplate(templateId) {
    const model = availableWorkoutModels.find(item => item.id === templateId);
    if (!model) return;
    const plan = cloneModelToWorkoutPlan(model, {
      active: true,
      createdAt: formatDate(new Date())
    });
    setFormData({ ...plan, days: normalizeWorkoutDays(plan) });
  }

  async function saveWorkoutAsModel(plan) {
    if (!user || !plan?.exercises?.length) return;
    try {
      const model = buildWorkoutModelFromPlan(plan, {
        createdAt: formatDate(new Date()),
        updatedAt: formatDate(new Date())
      });
      const docRef = await addDoc(collection(db, `users/${user.uid}/workoutModels`), model);
      setUserWorkoutModels(prev => [{ id: docRef.id, ...model }, ...prev]);
      alert("Modelo salvo.");
    } catch (error) {
      console.error("Error saving workout model:", error);
      alert("Erro ao salvar modelo");
    }
  }

  function applyLibraryExercise(exerciseName) {
    const exercise = EXERCISE_LIBRARY.find(item => item.name === exerciseName);
    if (!exercise) return;
    setExerciseForm(form => ({
      ...form,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      instructions: exercise.instructions
    }));
  }

  function resetExerciseEditor() {
    setExerciseForm(emptyExerciseForm);
    setEditingExerciseContext(null);
  }

  function startEditPlanExercise(dayIndex, exercise, groupId = null) {
    setExerciseForm({
      ...emptyExerciseForm,
      ...exercise,
      type: exercise.type || "normal"
    });
    setExerciseTargetDayIndex(String(dayIndex));
    setEditingExerciseContext({ dayIndex, exerciseId: exercise.id, groupId });
  }

  function saveEditedExercise() {
    if (!editingExerciseContext) return;
    const updatedExercise = { ...exerciseForm, id: editingExerciseContext.exerciseId || exerciseForm.id || `exercise-${Date.now()}` };
    setFormData(current => ({
      ...current,
      exercises: (current.exercises || []).map(exercise => (
        exercise.id === updatedExercise.id ? { ...exercise, ...updatedExercise } : exercise
      )),
      days: normalizeWorkoutDays(current).map((day, dayIndex) => {
        if (dayIndex !== editingExerciseContext.dayIndex) return day;

        if (editingExerciseContext.groupId) {
          return {
            ...day,
            groups: (day.groups || []).map(group => (
              group.id === editingExerciseContext.groupId
                ? {
                  ...group,
                  exercises: (group.exercises || []).map(exercise => (
                    exercise.id === updatedExercise.id ? { ...exercise, ...updatedExercise } : exercise
                  ))
                }
                : group
            ))
          };
        }

        return {
          ...day,
          exercises: (day.exercises || []).map(exercise => (
            exercise.id === updatedExercise.id ? { ...exercise, ...updatedExercise } : exercise
          ))
        };
      })
    }));
    resetExerciseEditor();
  }

  function removeExercise(idx) {
    setFormData(f => ({
      ...f,
      exercises: f.exercises.filter((_, i) => i !== idx)
    }));
    setExpandedExerciseEditorKey(null);
  }

  function updateExercise(idx, patch) {
    setFormData(f => ({
      ...f,
      exercises: f.exercises.map((exercise, exerciseIndex) => (
        exerciseIndex === idx ? { ...exercise, ...patch } : exercise
      ))
    }));
  }

  async function deleteWorkout(id) {
    if (!user || !window.confirm("Tem certeza?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${id}`));
      setWorkoutPlans(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  }

  async function duplicateWorkout(plan) {
    if (!user) return;
    try {
      const newData = {
        ...plan,
        name: `${plan.name || "Plano"} - copia`,
        active: false,
        status: "rascunho",
        createdAt: formatDate(new Date())
      };
      delete newData.id;
      const docRef = await addDoc(collection(db, `users/${user.uid}/students/${studentId}/workoutPlans`), newData);
      setWorkoutPlans(prev => [{ id: docRef.id, ...newData }, ...prev]);
    } catch (error) {
      console.error("Error duplicating workout:", error);
    }
  }

  async function toggleWorkoutActive(plan) {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${plan.id}`), {
        active: !plan.active,
        status: !plan.active ? "ativo" : "rascunho"
      });
      setWorkoutPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !p.active, status: !p.active ? "ativo" : "rascunho" } : p));
    } catch (error) {
      console.error("Error toggling workout:", error);
    }
  }

  async function finalizeWorkout(plan) {
    if (!user) return;
    if (!window.confirm("Finalizar este plano de treino? Ele continuara salvo no perfil e disponivel para edicao depois.")) return;
    try {
      const patch = {
        active: false,
        status: "finalizado",
        finishedAt: formatDate(new Date())
      };
      await updateDoc(doc(db, `users/${user.uid}/students/${studentId}/workoutPlans/${plan.id}`), patch);
      setWorkoutPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...patch } : p));
    } catch (error) {
      console.error("Error finalizing workout:", error);
      alert("Erro ao finalizar plano");
    }
  }

  function getPlanStatus(plan = {}) {
    if (plan.status === "finalizado" || plan.status === "finalized") return "Finalizado";
    if (plan.status === "rascunho" || plan.status === "draft") return "Rascunho";
    return plan.active ? "Ativo" : "Rascunho";
  }

  function getPlanDayCount(plan = {}) {
    const explicitDays = plan.days || plan.trainingDays || plan.dayPlans || [];
    if (Array.isArray(explicitDays) && explicitDays.length > 0) return explicitDays.length;
    return (plan.exercises || []).length > 0 ? 1 : 0;
  }

  function getPlanExerciseCount(plan = {}) {
    const days = normalizeWorkoutDays(plan);
    if (days.length > 0) {
      return days.reduce((total, day) => total + countDayExercises(day), 0);
    }
    return (plan.exercises || []).length;
  }

  function getPlanCoverInitial(plan = {}) {
    return String(plan.name || "P").trim().charAt(0).toUpperCase() || "P";
  }

  function normalizeWorkoutDays(plan = {}) {
    const explicitDays = plan.days || plan.trainingDays || plan.dayPlans || [];
    if (Array.isArray(explicitDays) && explicitDays.length > 0) {
      return explicitDays.map((day, index) => normalizeWorkoutDay(day, index, plan));
    }

    if (Array.isArray(plan.exercises) && plan.exercises.length > 0) {
      return [normalizeWorkoutDay({
        id: "day-1",
        dayNumber: 1,
        name: plan.name || "Treino",
        muscleGroup: inferDayMuscleGroup(plan.exercises),
        notes: "",
        exercises: plan.exercises
      }, 0, plan)];
    }

    return [];
  }

  function normalizeWorkoutDay(day = {}, index = 0, plan = {}) {
    const exercises = Array.isArray(day.exercises) ? day.exercises.map((exercise, exerciseIndex) => normalizePlanExercise(exercise, exerciseIndex)) : [];
    const groups = Array.isArray(day.groups)
      ? day.groups.map((group, groupIndex) => normalizeWorkoutGroup(group, groupIndex))
      : [];
    return {
      id: day.id || `day-${index + 1}`,
      dayNumber: Number(day.dayNumber) || index + 1,
      name: day.name || day.title || (index === 0 ? (plan.name || "Treino") : `Treino ${index + 1}`),
      muscleGroup: day.muscleGroup || day.primaryMuscle || day.group || inferDayMuscleGroup(exercises),
      notes: day.notes || day.observations || "",
      exercises,
      groups
    };
  }

  function normalizePlanExercise(exercise = {}, index = 0) {
    return {
      ...exercise,
      id: exercise.id || `exercise-${index + 1}-${String(exercise.name || "item").replace(/\s+/g, "-").toLowerCase()}`
    };
  }

  function normalizeWorkoutGroup(group = {}, index = 0) {
    const type = group.type === "superset" || group.type === "superserie" ? "superset" : "biset";
    return {
      id: group.id || `group-${index + 1}`,
      type,
      name: group.name || `${type === "biset" ? "Biset" : "Superserie"} ${index + 1}`,
      exercises: Array.isArray(group.exercises)
        ? group.exercises.map((exercise, exerciseIndex) => normalizePlanExercise(exercise, exerciseIndex))
        : []
    };
  }

  function inferDayMuscleGroup(exercises = []) {
    const groups = exercises.map(exercise => exercise.muscleGroup).filter(Boolean);
    return groups[0] || "";
  }

  function addWorkoutDay() {
    setFormData(current => {
      const days = normalizeWorkoutDays(current);
      const nextIndex = days.length;
      return {
        ...current,
        days: [
          ...days,
          normalizeWorkoutDay({
            id: `day-${Date.now()}`,
            dayNumber: nextIndex + 1,
            name: `Treino ${nextIndex + 1}`,
            muscleGroup: "",
            notes: "",
            exercises: []
          }, nextIndex, current)
        ]
      };
    });
  }

  function updateWorkoutDay(dayIndex, patch) {
    setFormData(current => ({
      ...current,
      days: normalizeWorkoutDays(current).map((day, index) => (
        index === dayIndex ? { ...day, ...patch } : day
      ))
    }));
  }

  function hasRelevantExerciseData(exercise = {}) {
    return ["name", "sets", "reps", "weight", "rest", "notes", "muscleGroup", "equipment", "instructions", "imageUrl"]
      .some(field => String(exercise[field] || "").trim());
  }

  function requestRemoveExercise(idx, exercise) {
    if (hasRelevantExerciseData(exercise) && !window.confirm("Remover este exercicio do plano?")) return;
    removeExercise(idx);
  }

  function removeWorkoutDay(dayIndex) {
    setFormData(current => ({
      ...current,
      days: normalizeWorkoutDays(current)
        .filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }))
    }));
    setExpandedWorkoutDay(null);
    setExerciseTargetDayIndex("");
  }

  function countDayExercises(day = {}) {
    const normalCount = (day.exercises || []).length;
    const groupCount = (day.groups || []).reduce((total, group) => total + (group.exercises || []).length, 0);
    return normalCount + groupCount;
  }

  function getShortText(value = "", maxLength = 86) {
    const text = String(value || "").trim();
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3).trim()}...`;
  }

  function getDayGroupName(type, groups = []) {
    const groupNumber = groups.filter(group => group.type === type).length + 1;
    return `${type === "biset" ? "Biset" : "Superserie"} ${groupNumber}`;
  }

  function createWorkoutGroup(dayIndex, type) {
    setFormData(current => ({
      ...current,
      days: normalizeWorkoutDays(current).map((day, index) => {
        if (index !== dayIndex) return day;
        const groupSize = type === "biset" ? 2 : Math.max(2, day.exercises.length);
        const selectedExercises = day.exercises.slice(0, groupSize);
        if (selectedExercises.length < 2) return day;

        const nextGroup = {
          id: `group-${Date.now()}`,
          type,
          name: getDayGroupName(type, day.groups || []),
          exercises: selectedExercises
        };

        return {
          ...day,
          exercises: day.exercises.slice(groupSize),
          groups: [...(day.groups || []), nextGroup]
        };
      })
    }));
  }

  function undoWorkoutGroup(dayIndex, groupId) {
    setFormData(current => ({
      ...current,
      days: normalizeWorkoutDays(current).map((day, index) => {
        if (index !== dayIndex) return day;
        const group = (day.groups || []).find(item => item.id === groupId);
        if (!group) return day;

        return {
          ...day,
          exercises: [...(day.exercises || []), ...(group.exercises || [])],
          groups: (day.groups || []).filter(item => item.id !== groupId)
        };
      })
    }));
  }

  function moveWorkoutGroupExercise(dayIndex, groupId, exerciseIndex, direction) {
    setFormData(current => ({
      ...current,
      days: normalizeWorkoutDays(current).map((day, index) => {
        if (index !== dayIndex) return day;
        return {
          ...day,
          groups: (day.groups || []).map(group => {
            if (group.id !== groupId) return group;
            const nextIndex = exerciseIndex + direction;
            if (nextIndex < 0 || nextIndex >= (group.exercises || []).length) return group;
            const exercises = [...group.exercises];
            const [movedExercise] = exercises.splice(exerciseIndex, 1);
            exercises.splice(nextIndex, 0, movedExercise);
            return { ...group, exercises };
          })
        };
      })
    }));
  }

  function getExerciseInitial(exercise = {}) {
    return String(exercise.name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function getExerciseImage(exercise = {}) {
    return exercise.imageUrl || exercise.image || exercise.coverUrl || "";
  }

  function formatExercisePrescription(exercise = {}) {
    const sets = exercise.sets ? `${exercise.sets} series` : "series nao definidas";
    const reps = exercise.reps ? `x ${exercise.reps} reps` : "x reps livres";
    return `${sets} ${reps}`;
  }

  function formatExerciseDetails(exercise = {}) {
    const details = [];
    if (exercise.weight) details.push(exercise.weight);
    if (exercise.rest) details.push(`descanso ${exercise.rest}`);
    return details.join(" · ");
  }

  function getExerciseTypeLabel(type = "normal") {
    if (type === "drop_set") return "Drop set";
    if (type === "biset") return "Biset";
    if (type === "superset") return "Superserie";
    return "Normal";
  }

  function renderPlanDayExercises(day = {}) {
    const exercises = day.exercises || [];
    const groups = day.groups || [];
    const exerciseCount = countDayExercises(day);
    if (exercises.length === 0 && groups.length === 0) {
      return <p>Este dia ainda nao tem exercicios.</p>;
    }

    return (
      <div className="profile-plan-day-detail-sheet">
        <div className="profile-plan-day-detail-header">
          <div>
            <strong>{day.name || "Treino do dia"}</strong>
            <span>{exerciseCount} exercicio{exerciseCount === 1 ? "" : "s"} neste dia</span>
          </div>
          {(day.muscleGroup || groups.length > 0) && (
            <div className="profile-plan-day-detail-tags">
              {day.muscleGroup && <span>{day.muscleGroup}</span>}
              {groups.length > 0 && <span>{groups.length} grupo{groups.length === 1 ? "" : "s"}</span>}
            </div>
          )}
        </div>
        {day.notes && <p className="profile-plan-day-detail-note">{day.notes}</p>}
        <div className="profile-plan-exercise-list">
          {exercises.map((exercise, exerciseIndex) => renderExerciseRow(exercise, exerciseIndex))}
        </div>
        {groups.length > 0 && (
          <div className="profile-plan-group-section">
            <strong>Grupos combinados</strong>
            {groups.map((group, groupIndex) => renderWorkoutGroup(group, groupIndex))}
          </div>
        )}
      </div>
    );
  }

  function renderExerciseRow(exercise, exerciseIndex, options = {}) {
    const tags = [exercise.muscleGroup, exercise.equipment].filter(Boolean);
    return (
      <div key={exercise.id || `${exercise.name || "exercise"}-${exerciseIndex}`} className={`profile-plan-exercise-row${options.editable ? " profile-plan-exercise-row-editable" : ""}`}>
        <div className="profile-plan-exercise-thumb">
          {getExerciseImage(exercise) ? <img src={getExerciseImage(exercise)} alt="" /> : <span>{getExerciseInitial(exercise)}</span>}
        </div>
        <div className="profile-plan-exercise-copy">
          <div className="profile-plan-exercise-title-row">
            <strong>{exercise.name || `Exercicio ${exerciseIndex + 1}`}</strong>
            <em>{getExerciseTypeLabel(exercise.type)}</em>
          </div>
          <span>{formatExercisePrescription(exercise)}</span>
          {formatExerciseDetails(exercise) && <small>{formatExerciseDetails(exercise)}</small>}
          {tags.length > 0 && (
            <div className="profile-plan-exercise-tags">
              {tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
          )}
          {exercise.notes && <p>{exercise.notes}</p>}
          {options.editable && (
            <button type="button" onClick={() => startEditPlanExercise(options.dayIndex, exercise, options.groupId || null)}>Editar</button>
          )}
        </div>
      </div>
    );
  }

  function renderWorkoutGroup(group = {}, groupIndex = 0, options = {}) {
    const groupExercises = group.exercises || [];
    const groupTypeLabel = group.type === "biset" ? "Biset" : "Superserie";
    const groupMenuKey = `group-${options.dayIndex ?? "view"}-${group.id || groupIndex}`;
    return (
      <div key={group.id || groupIndex} className={`profile-plan-exercise-group profile-plan-exercise-group-${group.type}`}>
        <div className="profile-plan-exercise-group-header">
          <div>
            <span>{group.name || `${groupTypeLabel} ${groupIndex + 1}`}</span>
            <small>{groupExercises.length} exercicio{groupExercises.length === 1 ? "" : "s"} em sequencia</small>
          </div>
          {options.editable && (
            <div className="profile-plan-menu-wrap profile-plan-inline-menu">
              <button
                type="button"
                className="profile-plan-menu-trigger"
                onClick={() => setOpenWorkoutActionMenu(openWorkoutActionMenu === groupMenuKey ? null : groupMenuKey)}
                aria-label={`Acoes do grupo ${group.name || groupTypeLabel}`}
              >
                ...
              </button>
              {openWorkoutActionMenu === groupMenuKey && (
                <div className="profile-plan-menu">
                  <button type="button" onClick={() => { undoWorkoutGroup(options.dayIndex, group.id); setOpenWorkoutActionMenu(null); }}>Desfazer grupo</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="profile-plan-exercise-group-body">
          {groupExercises.map((exercise, exerciseIndex) => {
            const tags = [exercise.muscleGroup, exercise.equipment].filter(Boolean);
            const groupExerciseMenuKey = `group-exercise-${options.dayIndex ?? "view"}-${group.id || groupIndex}-${exercise.id || exerciseIndex}`;
            return (
            <div key={exercise.id || exerciseIndex} className="profile-plan-group-exercise-line">
              <i />
              <div className="profile-plan-group-exercise-copy">
                <strong>{exercise.name || `Exercicio ${exerciseIndex + 1}`}</strong>
                <span>{formatExercisePrescription(exercise)}</span>
                {formatExerciseDetails(exercise) && <small>{formatExerciseDetails(exercise)}</small>}
                {tags.length > 0 && (
                  <div className="profile-plan-exercise-tags">
                    {tags.map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                )}
                {exercise.notes && <p>{exercise.notes}</p>}
              </div>
              {options.editable && (
                <div className="profile-plan-group-reorder">
                  <button type="button" onClick={() => startEditPlanExercise(options.dayIndex, exercise, group.id)}>Editar</button>
                  <div className="profile-plan-menu-wrap profile-plan-inline-menu">
                    <button
                      type="button"
                      className="profile-plan-menu-trigger"
                      onClick={() => setOpenWorkoutActionMenu(openWorkoutActionMenu === groupExerciseMenuKey ? null : groupExerciseMenuKey)}
                      aria-label={`Acoes do exercicio ${exercise.name || exerciseIndex + 1}`}
                    >
                      ...
                    </button>
                    {openWorkoutActionMenu === groupExerciseMenuKey && (
                      <div className="profile-plan-menu">
                        <button type="button" onClick={() => { moveWorkoutGroupExercise(options.dayIndex, group.id, exerciseIndex, -1); setOpenWorkoutActionMenu(null); }}>Subir</button>
                        <button type="button" onClick={() => { moveWorkoutGroupExercise(options.dayIndex, group.id, exerciseIndex, 1); setOpenWorkoutActionMenu(null); }}>Descer</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEditableExerciseCard(exercise = {}, idx = 0) {
    const editorKey = exercise.id || `general-${idx}`;
    const isExpanded = expandedExerciseEditorKey === editorKey;
    const exerciseMenuKey = `exercise-${editorKey}`;
    const summary = [
      exercise.muscleGroup,
      exercise.weight,
      exercise.rest ? `descanso ${exercise.rest}` : ""
    ].filter(Boolean).join(" - ");

    return (
      <div key={editorKey} className="profile-plan-edit-exercise-card">
        <div className="profile-plan-edit-exercise-summary">
          <div>
            <span>Exercicio {idx + 1}</span>
            <strong>{exercise.name || "Novo exercicio"} - {exercise.sets || "-"}x{exercise.reps || "-"}</strong>
            {summary && <small>{summary}</small>}
          </div>
          <div className="profile-plan-edit-exercise-actions">
            <button
              type="button"
              onClick={() => setExpandedExerciseEditorKey(isExpanded ? null : editorKey)}
            >
              {isExpanded ? "Recolher" : "Expandir"}
            </button>
            <div className="profile-plan-menu-wrap profile-plan-inline-menu">
              <button
                type="button"
                className="profile-plan-menu-trigger"
                onClick={() => setOpenWorkoutActionMenu(openWorkoutActionMenu === exerciseMenuKey ? null : exerciseMenuKey)}
                aria-label={`Acoes do exercicio ${exercise.name || idx + 1}`}
              >
                ...
              </button>
              {openWorkoutActionMenu === exerciseMenuKey && (
                <div className="profile-plan-menu">
                  <button type="button" className="profile-plan-menu-danger" onClick={() => { requestRemoveExercise(idx, exercise); setOpenWorkoutActionMenu(null); }}>Remover exercicio</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="profile-plan-edit-exercise-fields">
            <input type="text" value={exercise.name || ""} onChange={(event) => updateExercise(idx, { name: event.target.value })} placeholder="Exercicio" />
            <input type="text" value={exercise.muscleGroup || ""} onChange={(event) => updateExercise(idx, { muscleGroup: event.target.value })} placeholder="Grupo muscular" />
            <input type="text" value={exercise.equipment || ""} onChange={(event) => updateExercise(idx, { equipment: event.target.value })} placeholder="Equipamento" />
            <input type="text" value={exercise.sets || ""} onChange={(event) => updateExercise(idx, { sets: event.target.value })} placeholder="Series" />
            <input type="text" value={exercise.reps || ""} onChange={(event) => updateExercise(idx, { reps: event.target.value })} placeholder="Repeticoes" />
            <input type="text" value={exercise.weight || ""} onChange={(event) => updateExercise(idx, { weight: event.target.value })} placeholder="Carga" />
            <input type="text" value={exercise.rest || ""} onChange={(event) => updateExercise(idx, { rest: event.target.value })} placeholder="Descanso" />
            <select value={exercise.type || "normal"} onChange={(event) => updateExercise(idx, { type: event.target.value })}>
              <option value="normal">Normal</option>
              <option value="drop_set">Drop set</option>
              <option value="biset">Biset</option>
              <option value="superset">Superserie</option>
            </select>
            <input type="text" value={exercise.imageUrl || ""} onChange={(event) => updateExercise(idx, { imageUrl: event.target.value })} placeholder="Imagem ou icone" />
            <textarea value={exercise.notes || ""} onChange={(event) => updateExercise(idx, { notes: event.target.value })} placeholder="Observacoes" />
            <textarea value={exercise.instructions || ""} onChange={(event) => updateExercise(idx, { instructions: event.target.value })} placeholder="Instrucao tecnica" />
          </div>
        )}
      </div>
    );
  }

  function renderEditableWorkoutGroups(day = {}, dayIndex = 0) {
    const groups = day.groups || [];
    if (groups.length === 0) return null;

    return (
      <div className="profile-plan-group-section">
        <strong>Grupos do dia</strong>
        {groups.map((group, groupIndex) => renderWorkoutGroup(group, groupIndex, { editable: true, dayIndex }))}
      </div>
    );
  }

  return (
    <div className="profile-workouts-shell">
      <div className="profile-workouts-visual-header">
        <div>
          <span>Planos de treino</span>
          <strong>{workoutPlans.length} plano{workoutPlans.length === 1 ? "" : "s"} cadastrado{workoutPlans.length === 1 ? "" : "s"}</strong>
          <p>Visualize a ficha do aluno e entre em edicao apenas quando precisar montar ou ajustar o plano.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showNewWorkout) {
              resetWorkoutForm();
              setShowNewWorkout(false);
            } else {
              resetWorkoutForm();
              setShowNewWorkout(true);
            }
          }}
        >
          <IconPlus /> {showNewWorkout ? "Fechar edicao" : "Novo Plano"}
        </button>
      </div>

      {showNewWorkout && (
        <div className="profile-workout-edit-panel">
          <div className="profile-workout-edit-panel-header">
            <div>
              <span>Modo edicao</span>
              <strong>{editingWorkoutId ? "Editar plano" : "Novo plano"}</strong>
            </div>
            <p>Altere dias, exercicios, grupos e observacoes sem sair do perfil do aluno.</p>
          </div>

          <div className="student-form-field" style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Usar template</label>
            <select
              onChange={(e) => applyTemplate(e.target.value)}
              defaultValue=""
              disabled={!!editingWorkoutId}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            >
              <option value="">Selecionar modelo pronto</option>
              {availableWorkoutModels.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}{template.source === "user" ? " (seu modelo)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="student-form-field" style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Nome do Plano</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Plano hipertrofia - 3 dias"
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

          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData(f => ({ ...f, active: e.target.checked }))}
              style={{ cursor: "pointer" }}
            />
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7" }}>Plano ativo</label>
          </div>

          <div className="profile-plan-days-editor">
            <div className="profile-plan-days-header">
              <div>
                <h4>Dias do plano</h4>
                <p>Organize a ficha por dias antes de detalhar os exercicios.</p>
              </div>
              <button type="button" onClick={addWorkoutDay}>Adicionar dia</button>
            </div>

            {normalizeWorkoutDays(formData).length === 0 ? (
              <div className="profile-plan-day-empty">Nenhum dia criado ainda.</div>
            ) : (
              <div className="profile-plan-day-list">
                {normalizeWorkoutDays(formData).map((day, dayIndex) => (
                  <div key={day.id || dayIndex} className="profile-plan-day-card">
                    <div className="profile-plan-day-card-top">
                      <span className="profile-plan-day-badge">Dia {dayIndex + 1}</span>
                      <div className="profile-plan-day-actions">
                        <button
                          type="button"
                          onClick={() => setExpandedWorkoutDay(expandedWorkoutDay === `form-${dayIndex}` ? null : `form-${dayIndex}`)}
                        >
                          {expandedWorkoutDay === `form-${dayIndex}` ? "Fechar detalhe" : "Abrir detalhe"}
                        </button>
                        <div className="profile-plan-menu-wrap profile-plan-inline-menu">
                          <button
                            type="button"
                            className="profile-plan-menu-trigger"
                            onClick={() => setOpenWorkoutActionMenu(openWorkoutActionMenu === `day-${dayIndex}` ? null : `day-${dayIndex}`)}
                            aria-label={`Acoes do dia ${dayIndex + 1}`}
                          >
                            ...
                          </button>
                          {openWorkoutActionMenu === `day-${dayIndex}` && (
                            <div className="profile-plan-menu">
                              <button type="button" className="profile-plan-menu-danger" onClick={() => { removeWorkoutDay(dayIndex); setOpenWorkoutActionMenu(null); }}>Remover dia</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="profile-plan-day-fields">
                      <input
                        type="text"
                        value={day.name}
                        onChange={(event) => updateWorkoutDay(dayIndex, { name: event.target.value })}
                        placeholder="Nome do treino do dia"
                      />
                      <input
                        type="text"
                        value={day.muscleGroup}
                        onChange={(event) => updateWorkoutDay(dayIndex, { muscleGroup: event.target.value })}
                        placeholder="Grupo muscular principal"
                      />
                    </div>
                    <textarea
                      value={day.notes}
                      onChange={(event) => updateWorkoutDay(dayIndex, { notes: event.target.value })}
                      placeholder="Observacoes do dia"
                    />

                    <div className="profile-plan-day-summary">
                      <span>{countDayExercises(day)} exercicio{countDayExercises(day) === 1 ? "" : "s"}</span>
                      {day.muscleGroup && <span>{day.muscleGroup}</span>}
                    </div>

                    {expandedWorkoutDay === `form-${dayIndex}` && (
                      <div className="profile-plan-day-detail">
                        <strong>{day.name || `Dia ${dayIndex + 1}`}</strong>
                        <div className="profile-plan-group-actions">
                          <button
                            type="button"
                            onClick={() => createWorkoutGroup(dayIndex, "biset")}
                            disabled={(day.exercises || []).length < 2}
                          >
                            Criar biset
                          </button>
                          <button
                            type="button"
                            onClick={() => createWorkoutGroup(dayIndex, "superset")}
                            disabled={(day.exercises || []).length < 2}
                          >
                            Criar superserie
                          </button>
                        </div>
                        {(day.exercises || []).length > 0 ? (
                          (day.exercises || []).map((exercise, exerciseIndex) => renderExerciseRow(exercise, exerciseIndex, { editable: true, dayIndex }))
                        ) : (
                          <p>Nenhum exercicio normal fora de grupos.</p>
                        )}
                        {renderEditableWorkoutGroups(day, dayIndex)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", margin: "12px 0 8px 0" }}>Exercícios</h4>
          {editingExerciseContext && (
            <div className="profile-plan-editor-status">
              Editando exercicio do Dia {editingExerciseContext.dayIndex + 1}
              <button type="button" onClick={resetExerciseEditor}>Cancelar edicao</button>
            </div>
          )}

          {normalizeWorkoutDays(formData).length > 0 && (
            <div className="profile-plan-exercise-target">
              <label>Adicionar exercicio em</label>
              <select
                value={exerciseTargetDayIndex}
                onChange={(event) => setExerciseTargetDayIndex(event.target.value)}
              >
                <option value="">Somente na lista geral</option>
                {normalizeWorkoutDays(formData).map((day, dayIndex) => (
                  <option key={day.id || dayIndex} value={dayIndex}>
                    Dia {dayIndex + 1} - {day.name || `Treino ${dayIndex + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="profile-plan-edit-exercise-list">
            {formData.exercises.map((ex, idx) => {
              const editorKey = ex.id || `general-${idx}`;
              const isExpanded = expandedExerciseEditorKey === editorKey;
              const exerciseMenuKey = `exercise-${editorKey}`;
              const summary = [ex.muscleGroup, ex.weight, ex.rest ? `descanso ${ex.rest}` : ""].filter(Boolean).join(" - ");
              return (
              <div key={editorKey} className="profile-plan-edit-exercise-card">
                <div className="profile-plan-edit-exercise-summary">
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0, fontWeight: "700" }}>Exercício {idx + 1}</p>
                  <strong>{ex.name || "Novo exercicio"} - {ex.sets || "-"}x{ex.reps || "-"}</strong>
                  {summary && <small>{summary}</small>}
                  <div className="profile-plan-edit-exercise-actions">
                    <button type="button" onClick={() => setExpandedExerciseEditorKey(isExpanded ? null : editorKey)}>
                      {isExpanded ? "Recolher" : "Expandir"}
                    </button>
                    <div className="profile-plan-menu-wrap profile-plan-inline-menu">
                      <button
                        type="button"
                        className="profile-plan-menu-trigger"
                        onClick={() => setOpenWorkoutActionMenu(openWorkoutActionMenu === exerciseMenuKey ? null : exerciseMenuKey)}
                        aria-label={`Acoes do exercicio ${ex.name || idx + 1}`}
                      >
                        ...
                      </button>
                      {openWorkoutActionMenu === exerciseMenuKey && (
                        <div className="profile-plan-menu">
                          <button type="button" className="profile-plan-menu-danger" onClick={() => { requestRemoveExercise(idx, ex); setOpenWorkoutActionMenu(null); }}>Remover exercicio</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                <div className="profile-plan-edit-exercise-fields">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "8px", marginBottom: "8px" }}>
                  <input type="text" value={ex.name || ""} onChange={(e) => updateExercise(idx, { name: e.target.value })} placeholder="Exercício" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                  <input type="text" value={ex.muscleGroup || ""} onChange={(e) => updateExercise(idx, { muscleGroup: e.target.value })} placeholder="Grupo muscular" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                  <input type="text" value={ex.equipment || ""} onChange={(e) => updateExercise(idx, { equipment: e.target.value })} placeholder="Equipamento" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px", marginBottom: "8px" }}>
                  <input type="text" value={ex.sets || ""} onChange={(e) => updateExercise(idx, { sets: e.target.value })} placeholder="Séries" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                  <input type="text" value={ex.reps || ""} onChange={(e) => updateExercise(idx, { reps: e.target.value })} placeholder="Reps" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                  <input type="text" value={ex.weight || ""} onChange={(e) => updateExercise(idx, { weight: e.target.value })} placeholder="Carga" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                  <input type="text" value={ex.rest || ""} onChange={(e) => updateExercise(idx, { rest: e.target.value })} placeholder="Descanso" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", minWidth: 0 }} />
                </div>
                <textarea value={ex.notes || ""} onChange={(e) => updateExercise(idx, { notes: e.target.value })} placeholder="Observações do exercício" style={{ width: "100%", minHeight: "44px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
                  <select value={ex.type || "normal"} onChange={(e) => updateExercise(idx, { type: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="drop_set">Drop set</option>
                    <option value="biset">Biset</option>
                    <option value="superset">Superserie</option>
                  </select>
                  <input type="text" value={ex.imageUrl || ""} onChange={(e) => updateExercise(idx, { imageUrl: e.target.value })} placeholder="Imagem ou icone" />
                  <textarea value={ex.instructions || ""} onChange={(e) => updateExercise(idx, { instructions: e.target.value })} placeholder="Instrucao tecnica" />
                </div>
                )}
              </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <select
              value={EXERCISE_LIBRARY.some(item => item.name === exerciseForm.name) ? exerciseForm.name : ""}
              onChange={(e) => applyLibraryExercise(e.target.value)}
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            >
              <option value="">Biblioteca de exercícios</option>
              {EXERCISE_LIBRARY.map(exercise => (
                <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
              ))}
            </select>
            <select
              value={exerciseForm.type || "normal"}
              onChange={(e) => setExerciseForm(f => ({ ...f, type: e.target.value }))}
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            >
              <option value="normal">Normal</option>
              <option value="drop_set">Drop set</option>
              <option value="biset">Biset</option>
              <option value="superset">Superserie</option>
            </select>
            <input
              type="text"
              value={exerciseForm.name}
              onChange={(e) => setExerciseForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nome do exercício"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.imageUrl || ""}
              onChange={(e) => setExerciseForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="Imagem ou icone"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.muscleGroup}
              onChange={(e) => setExerciseForm(f => ({ ...f, muscleGroup: e.target.value }))}
              placeholder="Grupo muscular"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.equipment}
              onChange={(e) => setExerciseForm(f => ({ ...f, equipment: e.target.value }))}
              placeholder="Equipamento"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.sets}
              onChange={(e) => setExerciseForm(f => ({ ...f, sets: e.target.value }))}
              placeholder="Séries"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.reps}
              onChange={(e) => setExerciseForm(f => ({ ...f, reps: e.target.value }))}
              placeholder="Repetições"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.weight}
              onChange={(e) => setExerciseForm(f => ({ ...f, weight: e.target.value }))}
              placeholder="Carga"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.rest}
              onChange={(e) => setExerciseForm(f => ({ ...f, rest: e.target.value }))}
              placeholder="Descanso"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.notes}
              onChange={(e) => setExerciseForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observações"
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
            <input
              type="text"
              value={exerciseForm.instructions}
              onChange={(e) => setExerciseForm(f => ({ ...f, instructions: e.target.value }))}
              placeholder="Instrução técnica"
              style={{
                gridColumn: "1 / -1",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "12px",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
          </div>

          <button
            onClick={addExercise}
            disabled={!exerciseForm.name.trim()}
            style={{
              width: "100%",
              padding: "8px",
              background: exerciseForm.name.trim() ? theme.primary : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "12px"
            }}
          >
            {editingExerciseContext ? "Salvar exercicio" : "+ Adicionar Exercício"}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={saveWorkout}
              disabled={saving || !formData.name.trim() || ((formData.exercises || []).length === 0 && normalizeWorkoutDays(formData).length === 0)}
              style={{
                flex: 1,
                padding: "8px",
                background: theme.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {editingWorkoutId ? "Salvar plano" : "Salvar plano"}
            </button>
            <button
              onClick={() => {
                resetWorkoutForm();
                setShowNewWorkout(false);
              }}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                color: "#6b7280",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {workoutPlans.length === 0 ? (
        <p style={{ color: "#91A0B6", textAlign: "center", padding: "20px" }}>Nenhum treino cadastrado</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {workoutPlans.map(plan => (
            <div key={plan.id} className={`profile-plan-card profile-plan-card-${getPlanStatus(plan).toLowerCase()}`}>
              <div className="profile-plan-card-main">
                <button
                  type="button"
                  className="profile-plan-cover"
                  onClick={() => setExpandedWorkout(expandedWorkout === plan.id ? null : plan.id)}
                  aria-label={`Visualizar ${plan.name}`}
                >
                  {plan.coverUrl || plan.imageUrl ? <img src={plan.coverUrl || plan.imageUrl} alt="" /> : <span>{getPlanCoverInitial(plan)}</span>}
                </button>
                <div className="profile-plan-copy" onClick={() => setExpandedWorkout(expandedWorkout === plan.id ? null : plan.id)}>
                  <p>
                    {plan.name}
                    {plan.active && <span>Ativo</span>}
                  </p>
                  <small>{getPlanExerciseCount(plan)} exercicio{getPlanExerciseCount(plan) === 1 ? "" : "s"}</small>
                  <div className="profile-plan-meta-row">
                    <span className={`profile-plan-status profile-plan-status-${getPlanStatus(plan).toLowerCase()}`}>{getPlanStatus(plan)}</span>
                    <small>Comecou em {plan.startDate || plan.createdAt || "sem data"}</small>
                    <small>{getPlanDayCount(plan)} dia{getPlanDayCount(plan) === 1 ? "" : "s"} de treino</small>
                  </div>
                </div>
                <div className="profile-plan-menu-wrap">
                  <button
                    type="button"
                    className="profile-plan-menu-trigger"
                    onClick={() => setOpenPlanMenuId(openPlanMenuId === plan.id ? null : plan.id)}
                    aria-label={`Acoes do plano ${plan.name}`}
                  >
                    ...
                  </button>
                  {openPlanMenuId === plan.id && (
                    <div className="profile-plan-menu">
                      <button type="button" onClick={() => { duplicateWorkout(plan); setOpenPlanMenuId(null); }}>Duplicar</button>
                      <button type="button" onClick={() => { toggleWorkoutActive(plan); setOpenPlanMenuId(null); }}>{plan.active ? "Tornar rascunho" : "Tornar ativo"}</button>
                      <button type="button" onClick={() => { saveWorkoutAsModel(plan); setOpenPlanMenuId(null); }}>Salvar como modelo</button>
                      <button type="button" disabled={getPlanStatus(plan) === "Finalizado"} onClick={() => { finalizeWorkout(plan); setOpenPlanMenuId(null); }}>Finalizar</button>
                      <button type="button" className="profile-plan-menu-danger" onClick={() => { deleteWorkout(plan.id); setOpenPlanMenuId(null); }}>Excluir</button>
                    </div>
                  )}
                </div>
              </div>
                <div className="profile-plan-actions">
                  <button
                    type="button"
                    onClick={() => setExpandedWorkout(expandedWorkout === plan.id ? null : plan.id)}
                  >
                    {expandedWorkout === plan.id ? "Fechar" : "Visualizar"}
                  </button>
                  <button type="button" onClick={() => startEditWorkout(plan)}>
                    Editar
                  </button>
                </div>

              {expandedWorkout === plan.id && (
                <div className="profile-plan-expanded">
                  {normalizeWorkoutDays(plan).length > 0 ? (
                    <div className="profile-plan-day-list">
                      {normalizeWorkoutDays(plan).map((day, dayIndex) => (
                        <div key={day.id || dayIndex} className="profile-plan-day-card profile-plan-day-card-readonly profile-plan-day-card-visual">
                          <div className="profile-plan-day-visual-main">
                            <span className="profile-plan-day-badge profile-plan-day-badge-large">Dia {dayIndex + 1}</span>
                            <div className="profile-plan-day-visual-copy">
                              <strong>{day.name || `Treino ${dayIndex + 1}`}</strong>
                              <span>{day.muscleGroup || "Grupo nao definido"}</span>
                              {day.notes && <p>{getShortText(day.notes)}</p>}
                            </div>
                            <button
                              type="button"
                              className="profile-plan-day-open"
                              onClick={() => setExpandedWorkoutDay(expandedWorkoutDay === `${plan.id}-${dayIndex}` ? null : `${plan.id}-${dayIndex}`)}
                            >
                              {expandedWorkoutDay === `${plan.id}-${dayIndex}` ? "Fechar detalhe" : "Abrir detalhe"}
                            </button>
                          </div>
                          <div className="profile-plan-day-summary profile-plan-day-visual-meta">
                            <span>{countDayExercises(day)} exercicio{countDayExercises(day) === 1 ? "" : "s"}</span>
                            {(day.groups || []).length > 0 && <span>{(day.groups || []).length} grupo{(day.groups || []).length === 1 ? "" : "s"}</span>}
                            {(day.exercises || []).length > 0 && <span>{(day.exercises || []).length} {(day.exercises || []).length === 1 ? "normal" : "normais"}</span>}
                          </div>
                          {expandedWorkoutDay === `${plan.id}-${dayIndex}` && (
                            <div className="profile-plan-day-detail">
                              {renderPlanDayExercises(day)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Nenhum dia cadastrado neste plano.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== STUDENTS TAB ====================
function StudentsTab({ students, setStudents, records, scheduleOverrides, setScheduleOverrides, loadingData, theme }) {
  const { user } = useAuth();
  const defaultMonthlyPeriod = getCurrentMonthPeriod();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const defaultForm = {
    name: "",
    pricePerClass: "",
    schedule: [],
    notes: "",
    cpf: "",
    email: "",
    phone: "",
    birthDate: "",
    billingType: BILLING_TYPES.perClass,
    packageClasses: "",
    packagePrice: "",
    monthlyScheduleUndefined: false,
    billingCycleStart: defaultMonthlyPeriod.start,
    billingDueDate: defaultMonthlyPeriod.end,
    billingAutoRenew: true
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [monthlyPackagePriceTouched, setMonthlyPackagePriceTouched] = useState(false);

  const monthlyClassCount = form.billingType === BILLING_TYPES.monthlyPackage && !form.monthlyScheduleUndefined
    ? countScheduledClassesBetween(form.schedule, form.billingCycleStart, form.billingDueDate)
    : 0;
  const monthlySuggestedPrice = monthlyClassCount * (Number(form.pricePerClass) || 0);

  function resetForm() {
    setForm(defaultForm);
    setEditId(null);
    setShowForm(false);
    setFormError("");
    setMonthlyPackagePriceTouched(false);
  }

  function startEdit(s) {
    setFormError("");
    const monthlyPeriod = getCurrentMonthPeriod();
    setForm({
      name: s.name,
      pricePerClass: String(s.pricePerClass),
      schedule: [...s.schedule.map(x => ({ ...x }))],
      notes: s.notes || "",
      cpf: s.cpf || "",
      email: s.email || "",
      phone: s.phone || "",
      birthDate: s.birthDate || "",
      billingType: s.billingType || BILLING_TYPES.perClass,
      packageClasses: s.packageClasses ? String(s.packageClasses) : "",
      packagePrice: s.packagePrice ? String(s.packagePrice) : "",
      monthlyScheduleUndefined: s.monthlyScheduleUndefined || false,
      billingCycleStart: s.billingCycleStart || monthlyPeriod.start,
      billingDueDate: s.billingDueDate || monthlyPeriod.end,
      billingAutoRenew: s.billingAutoRenew !== false
    });
    setMonthlyPackagePriceTouched(Boolean(s.packagePrice));
    setEditId(s.id);
    setShowForm(true);
  }

  useEffect(() => {
    if (form.billingType !== BILLING_TYPES.monthlyPackage) return;
    if (form.monthlyScheduleUndefined) return;
    if (monthlyPackagePriceTouched) return;

    const nextValue = monthlySuggestedPrice > 0 ? String(monthlySuggestedPrice.toFixed(2)) : "";
    setForm(current => current.packagePrice === nextValue ? current : { ...current, packagePrice: nextValue });
  }, [
    form.billingType,
    form.monthlyScheduleUndefined,
    form.schedule,
    form.pricePerClass,
    form.billingCycleStart,
    form.billingDueDate,
    monthlyPackagePriceTouched,
    monthlySuggestedPrice
  ]);

  const [newTime, setNewTime] = useState({});

  function addScheduleTime(dayIdx) {
    const time = newTime[dayIdx];
    if (!time) return;
    setFormError("");
    setForm(f => {
      const exists = f.schedule.find(s => s.day === dayIdx && s.time === time);
      if (exists) return f;
      return { ...f, schedule: [...f.schedule, { day: dayIdx, time }] };
    });
    setNewTime(prev => ({ ...prev, [dayIdx]: "" }));
  }

  function removeScheduleTime(dayIdx, time) {
    setFormError("");
    setForm(f => ({
      ...f,
      schedule: f.schedule.filter(s => !(s.day === dayIdx && s.time === time))
    }));
  }

  function validateStudentForm() {
    if (!form.name.trim()) return "Informe o nome do aluno.";
    if (!form.pricePerClass) return "Informe o preço por aula. Mesmo em pacote, esse valor é usado nos relatórios.";
    if (Number(form.pricePerClass) <= 0) return "O preço por aula precisa ser maior que zero.";
    if (form.schedule.length === 0 && !(form.billingType === BILLING_TYPES.monthlyPackage && form.monthlyScheduleUndefined)) {
      return "Adicione pelo menos um horário da semana. Depois de escolher o horário, clique em + Adicionar.";
    }
    if (form.billingType !== BILLING_TYPES.perClass && form.billingType !== BILLING_TYPES.monthlyPackage) {
      if (!form.packageClasses) return "Informe a quantidade de aulas contratadas.";
      if (Number(form.packageClasses) <= 0) return "A quantidade de aulas contratadas precisa ser maior que zero.";
    }

    if (form.billingType !== BILLING_TYPES.perClass) {
      if (!(form.billingType === BILLING_TYPES.monthlyPackage && form.monthlyScheduleUndefined && !form.packagePrice)) {
        if (!form.packagePrice) return "Informe o valor do plano.";
        if (Number(form.packagePrice) <= 0) return "O valor do plano precisa ser maior que zero.";
      }
    }
    return "";
  }

  async function saveStudent() {
    const validationError = validateStudentForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!user) return;

    setFormError("");
    setSaving(true);
    try {
      const studentData = {
        name: form.name.trim(),
        pricePerClass: parseFloat(form.pricePerClass),
        schedule: form.schedule,
        notes: form.notes.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ""),
        birthDate: form.birthDate,
        billingType: form.billingType,
        packageClasses: form.billingType === BILLING_TYPES.perClass || form.billingType === BILLING_TYPES.monthlyPackage ? null : parseInt(form.packageClasses, 10),
        packagePrice: form.billingType === BILLING_TYPES.perClass || !form.packagePrice ? null : parseFloat(form.packagePrice),
        monthlyScheduleUndefined: form.billingType === BILLING_TYPES.monthlyPackage ? form.monthlyScheduleUndefined : false,
        billingCycleStart: form.billingType === BILLING_TYPES.perClass ? null : form.billingCycleStart,
        billingDueDate: form.billingType === BILLING_TYPES.perClass ? null : form.billingDueDate,
        billingAutoRenew: form.billingType === BILLING_TYPES.monthly || form.billingType === BILLING_TYPES.monthlyPackage ? form.billingAutoRenew : false
      };

      if (editId) {
        // Update existing student
        const oldStudent = students.find(s => s.id === editId);
        await updateDoc(doc(db, `users/${user.uid}/students/${editId}`), studentData);
        setStudents(prev => prev.map(s => s.id === editId ? { id: editId, ...studentData } : s));

        // Propagate schedule changes to future dates
        await propagateScheduleChanges(editId, oldStudent.schedule, form.schedule, user.uid);
      } else {
        // Create new student
        const docRef = await addDoc(collection(db, `users/${user.uid}/students`), studentData);
        setStudents(prev => [...prev, { id: docRef.id, ...studentData }]);
        setSelectedStudentId(docRef.id);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Erro ao salvar aluno");
    } finally {
      setSaving(false);
    }
  }

  async function propagateScheduleChanges(studentId, oldSchedule, newSchedule, uid) {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all overrides for this student
      const overridesSnap = await getDocs(collection(db, `users/${uid}/scheduleOverrides`));

      for (const doc of overridesSnap.docs) {
        const [dateStr, sId] = doc.id.split("_");
        if (sId !== studentId) continue;

        const overrideDate = new Date(dateStr);
        if (overrideDate >= tomorrow) {
          // Delete future overrides so new base schedule takes effect
          await deleteDoc(doc.ref);
        }
      }

      // Refresh schedule overrides in state
      const freshOverridesSnap = await getDocs(collection(db, `users/${uid}/scheduleOverrides`));
      const freshOverrides = freshOverridesSnap.docs.map(d => ({
        key: d.id,
        date: d.id.split("_")[0],
        studentId: d.id.split("_")[1],
        ...d.data()
      }));
      setScheduleOverrides(freshOverrides);

      alert("Horários base atualizados. Alterações específicas futuras foram removidas.");
    } catch (error) {
      console.error("Error propagating schedule changes:", error);
    }
  }

  async function deleteStudent(id) {
    if (!user) return;
    if (!window.confirm("Tem certeza?")) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/students/${id}`));
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Erro ao deletar aluno");
    }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleStudents = students
    .filter(student => {
      if (!normalizedSearch) return true;
      return [
        student.name,
        student.email,
        student.phone,
        student.cpf,
        student.notes
      ].some(value => String(value || "").toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  const studentsEmptyState = getStudentsEmptyState({
    hasStudents: students.length > 0,
    hasSearch: !!normalizedSearch
  });
  const billingStatuses = students.map(student => calculateBillingStatus(student, records));
  const overdueStudents = billingStatuses.filter(status => status.status === "overdue").length;
  const packageStudents = students.filter(student => student.billingType && student.billingType !== BILLING_TYPES.perClass).length;
  const getInitials = (name) => String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
  const getBillingStatusClassName = (billingStatus) => {
    if (billingStatus.status === "overdue" || billingStatus.status === "depleted") return "status-atrasado";
    if (billingStatus.status === "due_soon" || billingStatus.status === "low_classes") return "status-pendente";
    return "status-pago";
  };

  return (
    <div className="students-page">
      {!selectedStudentId && (
        <section className="app-card students-header-panel">
          <div className="students-header-row">
            <div>
              <p style={{ margin: "0 0 6px", color: "#F2CF7C", fontSize: "12px", fontWeight: "700" }}>CARTEIRA DE ALUNOS</p>
              <h2 className="app-page-title">Alunos</h2>
              <p className="app-page-kicker">Organize agenda, cobrança e histórico de treino de cada pessoa.</p>
            </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            minHeight: "44px",
            padding: "10px 14px",
            background: "#F2CF7C",
            color: "#142339",
            border: "none",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "none",
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.target.style.background = "#F6E3AA"}
          onMouseLeave={(e) => e.target.style.background = "#F2CF7C"}
        >
          <IconPlus /> Novo
        </button>
          </div>
          <div className="students-summary-grid">
            <div className="students-summary-item">
              <p style={{ margin: 0, color: "#F2CF7C", fontSize: "24px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{students.length}</p>
              <p style={{ margin: "4px 0 0", color: "#C2CAD7", fontSize: "11px", fontWeight: "500" }}>alunos cadastrados</p>
            </div>
            <div className="students-summary-item">
              <p style={{ margin: 0, color: "#F2CF7C", fontSize: "24px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{packageStudents}</p>
              <p style={{ margin: "4px 0 0", color: "#C2CAD7", fontSize: "11px", fontWeight: "500" }}>com plano/pacote</p>
            </div>
            <div className="students-summary-item">
              <p style={{ margin: 0, color: overdueStudents ? "#EF4444" : "#F2CF7C", fontSize: "24px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{overdueStudents}</p>
              <p style={{ margin: "4px 0 0", color: "#C2CAD7", fontSize: "11px", fontWeight: "500" }}>vencidos</p>
            </div>
          </div>
        </section>
      )}

      {loadingData && <p style={{ color: "#91A0B6", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      {!selectedStudentId && students.length > 0 && (
        <section className="students-search-panel">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou observação..."
            className="students-search-input"
          />
          {normalizedSearch && (
            <p style={{ fontSize: "11px", color: "#6b7280", margin: "6px 0 0 0" }}>
              {visibleStudents.length} aluno{visibleStudents.length === 1 ? "" : "s"} encontrado{visibleStudents.length === 1 ? "" : "s"}
            </p>
          )}
        </section>
      )}

      {showForm && (
        <div className="student-form-panel" style={{
          background: "#243B5C",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #4A6388"
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginTop: "0", marginBottom: "12px", color: "#FFFFFF" }}>
            {editId ? "Editar Aluno" : "Novo Aluno"}
          </h3>

          {formError && (
            <div style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #fecaca",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px"
            }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { setFormError(""); setForm(f => ({ ...f, name: e.target.value })); }}
              placeholder="Nome do aluno"
              disabled={saving}
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
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Preço/Aula (R$)</label>
            <input
              type="number"
              value={form.pricePerClass}
              onChange={(e) => { setFormError(""); setForm(f => ({ ...f, pricePerClass: e.target.value })); }}
              placeholder="70"
              disabled={saving}
              step="0.01"
              min="0"
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
          </div>

          <div className="student-form-section" style={{ marginBottom: "12px", padding: "12px", background: "#fff", border: `1px solid ${theme.light}`, borderRadius: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: theme.primary, margin: "0 0 10px 0" }}>Cobrança</p>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Tipo de cobrança</label>
              <select
                value={form.billingType}
                onChange={(e) => {
                  const nextBillingType = e.target.value;
                  const monthlyPeriod = getCurrentMonthPeriod();
                  setFormError("");
                  setMonthlyPackagePriceTouched(false);
                  setForm(f => ({
                    ...f,
                    billingType: nextBillingType,
                    monthlyScheduleUndefined: nextBillingType === BILLING_TYPES.monthlyPackage ? f.monthlyScheduleUndefined : false,
                    billingCycleStart: nextBillingType === BILLING_TYPES.monthlyPackage ? (f.billingCycleStart || monthlyPeriod.start) : f.billingCycleStart,
                    billingDueDate: nextBillingType === BILLING_TYPES.monthlyPackage ? (f.billingDueDate || monthlyPeriod.end) : f.billingDueDate,
                    packagePrice: nextBillingType === BILLING_TYPES.perClass ? "" : f.packagePrice
                  }));
                }}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
              >
                <option value={BILLING_TYPES.perClass}>Por aula</option>
                <option value={BILLING_TYPES.package}>Pacote de aulas</option>
                <option value={BILLING_TYPES.monthlyPackage}>Pacote mensal</option>
                <option value={BILLING_TYPES.monthly}>Mensalidade</option>
              </select>
            </div>

            {form.billingType !== BILLING_TYPES.perClass && (
              <>
                {form.billingType === BILLING_TYPES.monthlyPackage && (
                  <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
                    <div className="student-form-step-card" style={{ padding: "10px", background: "#142339", border: "1px solid #4A6388", borderRadius: "10px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 6px 0" }}>1. Dias de aula do pacote</p>
                      <p style={{ fontSize: "11px", color: "#A8B3CF", margin: "0 0 10px 0" }}>
                        Cadastre os horários da semana do aluno. Se ele ainda não tiver dias fixos, marque a opção abaixo para não gerar valor automático.
                      </p>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "700", color: "#FFFFFF" }}>
                        <input
                          type="checkbox"
                          checked={form.monthlyScheduleUndefined}
                          onChange={(e) => {
                            setFormError("");
                            setMonthlyPackagePriceTouched(false);
                            setForm(f => ({
                              ...f,
                              monthlyScheduleUndefined: e.target.checked,
                              packagePrice: e.target.checked ? "" : f.packagePrice
                            }));
                          }}
                          disabled={saving}
                        />
                        Aluno ainda sem dias definidos
                      </label>
                      {!form.monthlyScheduleUndefined && (
                        <p style={{ fontSize: "11px", color: "#A8B3CF", margin: "10px 0 0 0" }}>
                          Dias cadastrados agora: {form.schedule.length}. Aulas previstas no período: {monthlyClassCount}.
                        </p>
                      )}
                    </div>

                    <div className="student-form-step-card" style={{ padding: "10px", background: "#142339", border: "1px solid #4A6388", borderRadius: "10px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 8px 0" }}>2. Período do pacote</p>
                      <p style={{ fontSize: "11px", color: "#A8B3CF", margin: "0 0 10px 0" }}>
                        O padrão é do primeiro ao último dia do mês. Pode alterar se combinar outro período.
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600", color: "#A8B3CF", display: "block", marginBottom: "4px" }}>Início</label>
                          <input
                            type="date"
                            value={form.billingCycleStart}
                            onChange={(e) => setForm(f => ({ ...f, billingCycleStart: e.target.value }))}
                            disabled={saving}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #4A6388",
                              borderRadius: "8px",
                              fontSize: "13px",
                              boxSizing: "border-box",
                              fontFamily: "inherit",
                              color: "#FFFFFF",
                              background: "#181A2E"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600", color: "#A8B3CF", display: "block", marginBottom: "4px" }}>Fim</label>
                          <input
                            type="date"
                            value={form.billingDueDate}
                            onChange={(e) => setForm(f => ({ ...f, billingDueDate: e.target.value }))}
                            disabled={saving}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #4A6388",
                              borderRadius: "8px",
                              fontSize: "13px",
                              boxSizing: "border-box",
                              fontFamily: "inherit",
                              color: "#FFFFFF",
                              background: "#181A2E"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="student-form-step-card" style={{ padding: "10px", background: "#142339", border: "1px solid #4A6388", borderRadius: "10px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 6px 0" }}>3. Valor sugerido</p>
                      {form.monthlyScheduleUndefined ? (
                        <p style={{ fontSize: "11px", color: "#A8B3CF", margin: 0 }}>
                          Sem dias definidos, o app não preenche valor automaticamente. Informe um valor manual se já houver combinado.
                        </p>
                      ) : (
                        <p style={{ fontSize: "11px", color: "#A8B3CF", margin: 0 }}>
                          {monthlyClassCount} aula(s) x {formatCurrency(Number(form.pricePerClass) || 0)} = {formatCurrency(monthlySuggestedPrice)}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: form.billingType === BILLING_TYPES.monthlyPackage ? "1fr" : "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  {form.billingType !== BILLING_TYPES.monthlyPackage && <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Aulas contratadas</label>
                    <input
                      type="number"
                      value={form.packageClasses}
                      onChange={(e) => { setFormError(""); setForm(f => ({ ...f, packageClasses: e.target.value })); }}
                      placeholder="12"
                      disabled={saving}
                      min="1"
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
                  </div>}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>
                      {form.billingType === BILLING_TYPES.monthlyPackage ? "Valor mensal previsto (R$)" : "Valor do plano (R$)"}
                    </label>
                    <input
                      type="number"
                      value={form.packagePrice}
                      onChange={(e) => {
                        setFormError("");
                        if (form.billingType === BILLING_TYPES.monthlyPackage) setMonthlyPackagePriceTouched(true);
                        setForm(f => ({ ...f, packagePrice: e.target.value }));
                      }}
                      placeholder="840"
                      disabled={saving}
                      step="0.01"
                      min="0"
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
                  </div>
                </div>

                {form.billingType === BILLING_TYPES.monthlyPackage && monthlyPackagePriceTouched && !form.monthlyScheduleUndefined && (
                  <button
                    type="button"
                    onClick={() => setMonthlyPackagePriceTouched(false)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "#DBEAFE",
                      color: "#1D4ED8",
                      border: "1px solid #93C5FD",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: saving ? "not-allowed" : "pointer",
                      marginBottom: "10px"
                    }}
                  >
                    Recalcular pelo período e agenda
                  </button>
                )}

                {form.billingType !== BILLING_TYPES.monthlyPackage && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: form.billingType === BILLING_TYPES.monthly ? "10px" : "0" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Início do ciclo</label>
                    <input
                      type="date"
                      value={form.billingCycleStart}
                      onChange={(e) => setForm(f => ({ ...f, billingCycleStart: e.target.value }))}
                      disabled={saving}
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
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Vencimento</label>
                    <input
                      type="date"
                      value={form.billingDueDate}
                      onChange={(e) => setForm(f => ({ ...f, billingDueDate: e.target.value }))}
                      disabled={saving}
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
                  </div>
                </div>}

                {(form.billingType === BILLING_TYPES.monthly || form.billingType === BILLING_TYPES.monthlyPackage) && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", color: "#C2CAD7" }}>
                    <input
                      type="checkbox"
                      checked={form.billingAutoRenew}
                      onChange={(e) => setForm(f => ({ ...f, billingAutoRenew: e.target.checked }))}
                      disabled={saving}
                    />
                    Renovação mensal
                  </label>
                )}
              </>
            )}
          </div>

          <div className="student-form-section" style={{ marginBottom: "12px", padding: "12px", background: "#fff", border: `1px solid ${theme.light}`, borderRadius: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: theme.primary, margin: "0 0 10px 0" }}>Dados Pessoais (opcional)</p>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>CPF</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 11);
                  if (val.length > 5) val = val.slice(0, 3) + "." + val.slice(3, 6) + "." + val.slice(6, 9) + "-" + val.slice(9);
                  else if (val.length > 2) val = val.slice(0, 3) + "." + val.slice(3);
                  setForm(f => ({ ...f, cpf: val }));
                }}
                placeholder="000.000.000-00"
                disabled={saving}
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
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={saving}
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
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>WhatsApp</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 11);
                  if (val.length > 6) val = "(" + val.slice(0, 2) + ") " + val.slice(2, 7) + "-" + val.slice(7);
                  else if (val.length > 2) val = "(" + val.slice(0, 2) + ") " + val.slice(2);
                  setForm(f => ({ ...f, phone: val }));
                }}
                placeholder="(00) 00000-0000"
                disabled={saving}
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
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Data de Nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm(f => ({ ...f, birthDate: e.target.value }))}
                disabled={saving}
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
            </div>
          </div>

          <div className="student-form-field" style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "4px" }}>Observações (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas sobre o aluno..."
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
                fontFamily: "inherit",
                minHeight: "60px",
                resize: "vertical"
              }}
            />
          </div>

          <div className="student-form-section" style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#C2CAD7", display: "block", marginBottom: "8px" }}>Horários da Semana</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {DAYS.map((day, dayIdx) => {
                const dayTimes = form.schedule.filter(s => s.day === dayIdx).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={dayIdx} className="student-schedule-day-card" style={{ background: "#fff", border: "1px solid #4A6388", borderRadius: "8px", padding: "10px 12px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: theme.primary, margin: "0 0 6px" }}>{day}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: dayTimes.length > 0 ? "8px" : "0" }}>
                      {dayTimes.map(s => (
                        <span key={s.time} style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          background: theme.light, color: theme.dark, padding: "4px 8px",
                          borderRadius: "6px", fontSize: "12px", fontWeight: "600"
                        }}>
                          {s.time}
                          <span onClick={() => removeScheduleTime(dayIdx, s.time)}
                            style={{ cursor: "pointer", color: theme.soft, fontWeight: "700", fontSize: "14px", lineHeight: "1" }}>×</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="time"
                        value={newTime[dayIdx] || ""}
                        onChange={(e) => setNewTime(prev => ({ ...prev, [dayIdx]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") addScheduleTime(dayIdx); }}
                        disabled={saving}
                        style={{
                          flex: 1, padding: "6px 8px", border: "1px solid #d1d5db",
                          borderRadius: "6px", fontSize: "13px", fontFamily: "inherit"
                        }}
                      />
                      <button
                        onClick={() => addScheduleTime(dayIdx)}
                        disabled={saving || !newTime[dayIdx]}
                        style={{
                          padding: "6px 12px", background: newTime[dayIdx] ? theme.primary : "#d1d5db",
                          color: "white", border: "none", borderRadius: "6px",
                          fontSize: "12px", fontWeight: "600", cursor: newTime[dayIdx] ? "pointer" : "default"
                        }}
                      >+ Adicionar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={saveStudent}
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px",
                background: saving ? "#d1d5db" : theme.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {editId ? "Atualizar Aluno" : "Criar e abrir perfil"}
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                background: "#f3f4f6",
                color: "#6b7280",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!loadingData && !selectedStudentId && (
        <div className="students-list">
          {visibleStudents.length === 0 && (
            <div className="app-card setup-empty-card">
              <p>{studentsEmptyState.title}</p>
              <small>{studentsEmptyState.description}</small>
              {studentsEmptyState.actionLabel && (
                <button type="button" onClick={() => setShowForm(true)}>
                  <IconPlus /> {studentsEmptyState.actionLabel}
                </button>
              )}
            </div>
          )}
          {visibleStudents.map(student => {
            const billingStatus = calculateBillingStatus(student, records);
            return (
              <article key={student.id} onClick={() => setSelectedStudentId(student.id)} className="student-list-card">
                <div className="student-card-top">
                  <div style={{ display: "flex", gap: "11px", minWidth: 0, flex: 1 }}>
                    <div className="student-avatar">{getInitials(student.name)}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: "500", margin: "0 0 4px 0", color: "#FFFFFF" }}>{student.name}</p>
                <p style={{ fontSize: "11px", color: "#C2CAD7", margin: "0 0 8px 0" }}>
                  {billingStatus.billingTypeLabel} - {formatCurrency(student.pricePerClass)}/aula
                </p>
                {billingStatus.billingType !== BILLING_TYPES.perClass && (
                  <div className="student-badge-row">
                    <span className={getBillingStatusClassName(billingStatus)}>
                      {getBillingStatusLabel(billingStatus)}
                    </span>
                    {billingStatus.contractedClasses > 0 && <span className="student-pill student-pill-info">
                      {billingStatus.usedClasses}/{billingStatus.contractedClasses} usadas
                    </span>}
                    {billingStatus.contractedClasses > 0 && <span className="student-pill student-pill-muted">
                      {billingStatus.remainingClasses} restantes
                    </span>}
                    {billingStatus.billingType === BILLING_TYPES.monthlyPackage && billingStatus.contractedClasses === 0 && <span className="student-pill student-pill-info">
                      Aulas calculadas no mês
                    </span>}
                  </div>
                )}
                {billingStatus.billingType === BILLING_TYPES.perClass && (
                  <div className="student-badge-row">
                    <span className="status-pago">Em dia</span>
                  </div>
                )}
                    </div>
                  </div>
              <div className="student-card-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(student); }}
                  className="student-icon-button"
                >
                  <IconEdit />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteStudent(student.id); }}
                  className="student-icon-button student-icon-danger"
                >
                  <IconTrash />
                </button>
              </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedStudentId(student.id); }}
                  className="student-open-profile-button"
                >
                  Abrir perfil completo
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selectedStudentId && (
        <StudentProfile
          studentId={selectedStudentId}
          student={students.find(s => s.id === selectedStudentId)}
          records={records}
          onBack={() => setSelectedStudentId(null)}
          onEdit={(s) => { setSelectedStudentId(null); startEdit(s); }}
          theme={theme}
        />
      )}
    </div>
  );
}

export { StudentsTab };
