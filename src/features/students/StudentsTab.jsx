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
import { formatDate, formatDateISO } from '../../lib/dates';
import {
  BILLING_TYPES,
  calculateBillingStatus,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';
import { EXERCISE_LIBRARY, WORKOUT_TEMPLATES } from '../workouts/workoutPresets';

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

// ==================== STUDENT PROFILE ====================
function StudentProfile({ studentId, student, records, onBack, onEdit, theme }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dados");
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
      const workoutData = workoutSnap.docs.map(doc => ({
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
    } finally {
      setLoadingProfile(false);
    }
  }

  const tabItems = [
    { id: "dados", label: "Dados", icon: <IconUser /> },
    { id: "anamnese", label: "Anamnese", icon: <IconUser /> },
    { id: "medidas", label: "Medidas", icon: <IconRuler /> },
    { id: "fotos", label: "Fotos", icon: <IconRuler /> },
    { id: "treinos", label: "Treinos", icon: <IconDumbbell /> }
  ];

  return (
    <div style={{ padding: "16px" }}>
      <button
        onClick={onBack}
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

      <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px 0", color: "#1f2937" }}>{student.name}</h2>
      <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "16px" }}>
        {student.email && <p style={{ margin: "0" }}>📧 {student.email}</p>}
        {student.phone && <p style={{ margin: "0" }}>📱 {student.phone}</p>}
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", borderBottom: `2px solid #e5e7eb` }}>
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {loadingProfile && <p style={{ color: "#9ca3af", textAlign: "center" }}>Carregando...</p>}

      {activeTab === "dados" && <DataTabContent student={student} records={records} onEdit={onEdit} theme={theme} />}
      {activeTab === "anamnese" && <AnamnesisTabContent studentId={studentId} anamnesis={anamnesis} setAnamnesis={setAnamnesis} theme={theme} />}
      {activeTab === "medidas" && <MeasurementsTabContent studentId={studentId} measurements={measurements} setMeasurements={setMeasurements} showNewMeasurement={showNewMeasurement} setShowNewMeasurement={setShowNewMeasurement} expandedMeasurement={expandedMeasurement} setExpandedMeasurement={setExpandedMeasurement} theme={theme} />}
      {activeTab === "fotos" && <ProgressPhotosTabContent studentId={studentId} photos={progressPhotos} setPhotos={setProgressPhotos} showNewPhoto={showNewPhoto} setShowNewPhoto={setShowNewPhoto} theme={theme} />}
      {activeTab === "treinos" && <WorkoutsTabContent studentId={studentId} workoutPlans={workoutPlans} setWorkoutPlans={setWorkoutPlans} showNewWorkout={showNewWorkout} setShowNewWorkout={setShowNewWorkout} expandedWorkout={expandedWorkout} setExpandedWorkout={setExpandedWorkout} theme={theme} />}
    </div>
  );
}

function DataTabContent({ student, records, onEdit, theme }) {
  const billingStatus = calculateBillingStatus(student, records);
  const billingColors = getBillingStatusColors(billingStatus);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", margin: "0 0 12px 0" }}>Dados Pessoais</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Nome</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{student.name}</p>
          </div>
          {student.cpf && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>CPF</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{student.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
          </div>}
          {student.email && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>E-mail</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{student.email}</p>
          </div>}
          {student.phone && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>WhatsApp</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{student.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}</p>
          </div>}
          {student.birthDate && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Data de Nascimento</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{new Date(student.birthDate).toLocaleDateString("pt-BR")}</p>
          </div>}
          <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Preço/Aula</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: theme.primary }}>{formatCurrency(student.pricePerClass)}</p>
          </div>
        </div>
      </div>

      <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", margin: "0 0 12px 0" }}>Cobrança</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Tipo</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{billingStatus.billingTypeLabel}</p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Status</p>
            <span style={{
              display: "inline-block",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "700",
              background: billingColors.background,
              color: billingColors.color
            }}>
              {getBillingStatusLabel(billingStatus)}
            </span>
          </div>
          {billingStatus.planValue > 0 && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Valor do plano</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: theme.primary }}>{formatCurrency(billingStatus.planValue)}</p>
          </div>}
          {billingStatus.contractedClasses > 0 && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Aulas</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>
              {billingStatus.usedClasses}/{billingStatus.contractedClasses} usadas
            </p>
          </div>}
          {billingStatus.remainingClasses !== null && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Restantes</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: billingColors.color }}>{billingStatus.remainingClasses} aulas</p>
          </div>}
          {student.billingDueDate && <div>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0" }}>Vencimento</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1f2937" }}>{new Date(student.billingDueDate).toLocaleDateString("pt-BR")}</p>
          </div>}
        </div>
      </div>

      <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", margin: "0 0 12px 0" }}>Horários da Semana</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {student.schedule && student.schedule.length > 0 ? (
            DAYS.map((day, idx) => {
              const times = student.schedule.filter(s => s.day === idx).map(s => s.time).sort();
              return times.length > 0 ? (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#4b5563", fontWeight: "600" }}>{day}:</span>
                  <span style={{ fontSize: "13px", color: "#1f2937" }}>{times.join(", ")}</span>
                </div>
              ) : null;
            })
          ) : <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0" }}>Sem horários definidos</p>}
        </div>
      </div>

      {student.notes && <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", margin: "0 0 8px 0" }}>Observações</h3>
        <p style={{ fontSize: "13px", color: "#1f2937", margin: "0", whiteSpace: "pre-wrap" }}>{student.notes}</p>
      </div>}

      <button
        onClick={() => onEdit(student)}
        style={{
          padding: "10px 16px",
          background: theme.primary,
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer"
        }}
      >
        Editar
      </button>
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
    form.injuries?.trim() ? "Lesao registrada" : null,
    form.restrictions?.trim() ? "Restricao de treino" : null,
    form.conditions?.trim() ? "Condicao de saude" : null,
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
    { key: "trainingHistory", label: "Historico de treino", placeholder: "Tempo de treino, modalidades, rotina atual..." },
    { key: "injuries", label: "Lesoes", placeholder: "Dores, cirurgias, lesoes antigas ou atuais..." },
    { key: "restrictions", label: "Restricoes", placeholder: "Movimentos proibidos, limitacoes, recomendacoes medicas..." },
    { key: "conditions", label: "Doencas/condicoes", placeholder: "Hipertensao, diabetes, problemas cardiacos..." },
    { key: "medications", label: "Medicamentos", placeholder: "Medicamentos em uso e frequencia..." },
    { key: "sleep", label: "Sono", placeholder: "Horas por noite e qualidade do sono..." },
    { key: "nutrition", label: "Alimentacao", placeholder: "Rotina alimentar, acompanhamento nutricional..." },
    { key: "availability", label: "Disponibilidade", placeholder: "Dias, horarios e frequencia possivel..." },
    { key: "notes", label: "Observacoes gerais", placeholder: "Qualquer informacao importante para acompanhamento..." }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", margin: "0 0 8px 0" }}>Resumo de risco</p>
        {riskItems.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>Nenhum ponto sensivel registrado.</p>
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
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>{field.label}</label>
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
    if (!user || (!form.frontUrl.trim() && !form.sideUrl.trim() && !form.backUrl.trim())) return;
    setSaving(true);
    try {
      const data = {
        date: form.date,
        frontUrl: form.frontUrl.trim(),
        sideUrl: form.sideUrl.trim(),
        backUrl: form.backUrl.trim(),
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
          color: "white",
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
        <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: `1px solid ${theme.light}` }}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
              style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>
          {photoFields.map(field => (
            <div key={field.key} style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>{field.label}</label>
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
            placeholder="Observacoes sobre postura, medidas, aderencia..."
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
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>Nenhuma foto de evolucao cadastrada</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#1f2937", margin: "0" }}>{new Date(photo.date).toLocaleDateString("pt-BR")}</p>
                  {photo.notes && <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>{photo.notes}</p>}
                </div>
                <button onClick={() => deletePhotoSet(photo.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "4px", padding: "5px 8px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Remover</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {photoFields.map(field => (
                  <div key={field.key} style={{ background: "#f9fafb", borderRadius: "6px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "10px", fontWeight: "700", color: "#6b7280", margin: "0", padding: "6px" }}>{field.label}</p>
                    {photo[field.key] ? (
                      <img src={photo[field.key]} alt={field.label} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ aspectRatio: "3 / 4", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "11px" }}>Sem foto</div>
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
          color: "white",
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
        <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: `1px solid ${theme.light}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Data</label>
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
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Peso (kg)</label>
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
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Altura (cm)</label>
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
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>IMC (auto)</label>
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
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Peitoral (cm)</label>
              <input type="number" value={formData.peitoral} onChange={(e) => setFormData(f => ({ ...f, peitoral: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Cintura (cm)</label>
              <input type="number" value={formData.cintura} onChange={(e) => setFormData(f => ({ ...f, cintura: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Quadril (cm)</label>
              <input type="number" value={formData.quadril} onChange={(e) => setFormData(f => ({ ...f, quadril: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>% Gordura</label>
              <input type="number" value={formData.gordura} onChange={(e) => setFormData(f => ({ ...f, gordura: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Braço D (cm)</label>
              <input type="number" value={formData.bracoD} onChange={(e) => setFormData(f => ({ ...f, bracoD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Braço E (cm)</label>
              <input type="number" value={formData.bracoE} onChange={(e) => setFormData(f => ({ ...f, bracoE: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Coxa D (cm)</label>
              <input type="number" value={formData.coxaD} onChange={(e) => setFormData(f => ({ ...f, coxaD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Coxa E (cm)</label>
              <input type="number" value={formData.coxaE} onChange={(e) => setFormData(f => ({ ...f, coxaE: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Panturrilha D (cm)</label>
              <input type="number" value={formData.panturrilhaD} onChange={(e) => setFormData(f => ({ ...f, panturrilhaD: e.target.value }))} step="0.1" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Panturrilha E (cm)</label>
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
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>Nenhuma medição registrada</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {measurements.map((m, idx) => {
            const prev = idx < measurements.length - 1 ? measurements[idx + 1] : null;
            const pesoChange = prev ? (m.peso - prev.peso) : null;
            const gorduraChange = prev ? (m.gordura - prev.gordura) : null;

            return (
              <div key={m.id} onClick={() => setExpandedMeasurement(expandedMeasurement === m.id ? null : m.id)} style={{
                background: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                cursor: "pointer"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: "600", color: "#1f2937", margin: "0" }}>{m.date}</p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0 0" }}>Peso: {m.peso}kg | IMC: {m.imc}</p>
                    {m.gordura && <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0" }}>Gordura: {m.gordura}%</p>}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {pesoChange && <span style={{ fontSize: "14px", color: pesoChange < 0 ? "#059669" : "#dc2626" }}>{pesoChange < 0 ? "↓" : "↑"}</span>}
                    {gorduraChange && <span style={{ fontSize: "14px", color: gorduraChange < 0 ? "#059669" : "#dc2626" }}>{gorduraChange < 0 ? "↓" : "↑"}</span>}
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
  const [saving, setSaving] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [formData, setFormData] = useState({ name: "", active: true, exercises: [] });
  const [exerciseForm, setExerciseForm] = useState({ name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" });

  async function saveWorkout() {
    if (!formData.name.trim() || formData.exercises.length === 0) return;
    if (!user) return;
    setSaving(true);

    try {
      const existingWorkout = editingWorkoutId ? workoutPlans.find(plan => plan.id === editingWorkoutId) : null;
      const data = {
        name: formData.name,
        createdAt: existingWorkout?.createdAt || formatDate(new Date()),
        active: formData.active,
        exercises: formData.exercises
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
    setFormData({ name: "", active: true, exercises: [] });
    setExerciseForm({ name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" });
  }

  function startEditWorkout(plan) {
    setEditingWorkoutId(plan.id);
    setFormData({
      name: plan.name || "",
      active: plan.active !== false,
      exercises: (plan.exercises || []).map(exercise => ({ ...exercise }))
    });
    setExerciseForm({ name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" });
    setShowNewWorkout(true);
    setExpandedWorkout(plan.id);
  }

  function addExercise() {
    if (!exerciseForm.name.trim()) return;
    setFormData(f => ({
      ...f,
      exercises: [...f.exercises, { ...exerciseForm }]
    }));
    setExerciseForm({ name: "", sets: "", reps: "", weight: "", rest: "", notes: "", muscleGroup: "", equipment: "", instructions: "" });
  }

  function applyTemplate(templateId) {
    const template = WORKOUT_TEMPLATES.find(item => item.id === templateId);
    if (!template) return;
    setFormData({
      name: template.name,
      active: true,
      exercises: template.exercises.map(exercise => ({ ...exercise }))
    });
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

  function removeExercise(idx) {
    setFormData(f => ({
      ...f,
      exercises: f.exercises.filter((_, i) => i !== idx)
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
      const newData = { ...plan };
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
        active: !plan.active
      });
      setWorkoutPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !p.active } : p));
    } catch (error) {
      console.error("Error toggling workout:", error);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => {
          if (showNewWorkout) {
            resetWorkoutForm();
            setShowNewWorkout(false);
          } else {
            resetWorkoutForm();
            setShowNewWorkout(true);
          }
        }}
        style={{
          padding: "10px 16px",
          background: theme.primary,
          color: "white",
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
        <IconPlus /> {showNewWorkout ? "Fechar" : "Novo Treino"}
      </button>

      {showNewWorkout && (
        <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: `1px solid ${theme.light}` }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Usar template</label>
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
              {WORKOUT_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Nome do Treino</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Treino A - Peito/Tríceps"
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
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Treino ativo</label>
          </div>

          <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", margin: "12px 0 8px 0" }}>Exercícios</h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {formData.exercises.map((ex, idx) => (
              <div key={idx} style={{ background: "white", padding: "8px", borderRadius: "6px", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#1f2937" }}>
                  {ex.name} ({ex.sets}s x {ex.reps}r)
                  {(ex.muscleGroup || ex.equipment) && <span style={{ color: "#9ca3af" }}> - {[ex.muscleGroup, ex.equipment].filter(Boolean).join(" / ")}</span>}
                </span>
                <button onClick={() => removeExercise(idx)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "16px" }}>×</button>
              </div>
            ))}
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
              <option value="">Biblioteca de exercicios</option>
              {EXERCISE_LIBRARY.map(exercise => (
                <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
              ))}
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
              placeholder="Instrucao tecnica"
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
            + Adicionar Exercício
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={saveWorkout}
              disabled={saving || !formData.name.trim() || formData.exercises.length === 0}
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
              {editingWorkoutId ? " alteracoes" : ""}
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
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>Nenhum treino cadastrado</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {workoutPlans.map(plan => (
            <div key={plan.id} style={{
              background: "white",
              padding: "12px",
              borderRadius: "8px",
              border: plan.active ? `2px solid ${theme.primary}` : "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                <div onClick={() => setExpandedWorkout(expandedWorkout === plan.id ? null : plan.id)} style={{ flex: 1, cursor: "pointer" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", margin: "0", color: "#1f2937" }}>
                    {plan.name}
                    {plan.active && <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", background: theme.light, color: theme.dark, borderRadius: "4px" }}>Ativo</span>}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: "4px 0 0 0" }}>{plan.exercises?.length || 0} exercícios</p>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => startEditWorkout(plan)}
                    style={{
                      padding: "4px 8px",
                      background: theme.light,
                      border: "none",
                      color: theme.dark,
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "700"
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleWorkoutActive(plan)}
                    title={plan.active ? "Desativar" : "Ativar"}
                    style={{
                      padding: "4px 8px",
                      background: "none",
                      border: `1px solid ${theme.primary}`,
                      color: theme.primary,
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "600"
                    }}
                  >
                    {plan.active ? "✓" : "○"}
                  </button>
                  <button
                    onClick={() => duplicateWorkout(plan)}
                    style={{
                      padding: "4px 8px",
                      background: "#f3f4f6",
                      border: "none",
                      color: "#6b7280",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    <IconCopy />
                  </button>
                  <button
                    onClick={() => deleteWorkout(plan.id)}
                    style={{
                      padding: "4px 8px",
                      background: "#fee2e2",
                      border: "none",
                      color: "#dc2626",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {expandedWorkout === plan.id && plan.exercises && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {plan.exercises.map((ex, idx) => (
                    <div key={idx} style={{ fontSize: "11px", padding: "4px 0", display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <strong>{ex.name}</strong>
                        {(ex.muscleGroup || ex.equipment) && (
                          <span style={{ color: "#9ca3af" }}> - {[ex.muscleGroup, ex.equipment].filter(Boolean).join(" / ")}</span>
                        )}
                        {ex.instructions && <p style={{ color: "#6b7280", margin: "2px 0 0 0" }}>{ex.instructions}</p>}
                      </span>
                      <span style={{ color: "#9ca3af" }}>{ex.sets}s × {ex.reps}r {ex.weight ? `@ ${ex.weight}` : ""}</span>
                    </div>
                  ))}
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
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
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
    billingCycleStart: formatDateISO(new Date()),
    billingDueDate: "",
    billingAutoRenew: true
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function resetForm() {
    setForm(defaultForm);
    setEditId(null);
    setShowForm(false);
    setFormError("");
  }

  function startEdit(s) {
    setFormError("");
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
      billingCycleStart: s.billingCycleStart || formatDateISO(new Date()),
      billingDueDate: s.billingDueDate || "",
      billingAutoRenew: s.billingAutoRenew !== false
    });
    setEditId(s.id);
    setShowForm(true);
  }

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
    if (form.schedule.length === 0) return "Adicione pelo menos um horário da semana. Depois de escolher o horário, clique em + Adicionar.";
    if (form.billingType !== BILLING_TYPES.perClass && form.billingType !== BILLING_TYPES.monthlyPackage) {
      if (!form.packageClasses) return "Informe a quantidade de aulas contratadas.";
      if (Number(form.packageClasses) <= 0) return "A quantidade de aulas contratadas precisa ser maior que zero.";
    }

    if (form.billingType !== BILLING_TYPES.perClass) {
      if (!form.packagePrice) return "Informe o valor do plano.";
      if (Number(form.packagePrice) <= 0) return "O valor do plano precisa ser maior que zero.";
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
        packagePrice: form.billingType === BILLING_TYPES.perClass ? null : parseFloat(form.packagePrice),
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

  // Get last attendance for a student
  function getLastAttendance(studentId) {
    // This would need records to be passed - for now returning null
    return null;
  }

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0", color: "#1f2937" }}>
          Alunos ({students.length})
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "8px 12px",
            background: theme.primary,
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.background = theme.dark}
          onMouseLeave={(e) => e.target.style.background = theme.primary}
        >
          <IconPlus /> Novo
        </button>
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      {showForm && (
        <div style={{
          background: "#f9fafb",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginTop: "0", marginBottom: "12px", color: "#1f2937" }}>
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
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Nome</label>
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
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Preço/Aula (R$)</label>
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

          <div style={{ marginBottom: "12px", padding: "12px", background: "#fff", border: `1px solid ${theme.light}`, borderRadius: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: theme.primary, margin: "0 0 10px 0" }}>Cobrança</p>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Tipo de cobrança</label>
              <select
                value={form.billingType}
                onChange={(e) => { setFormError(""); setForm(f => ({ ...f, billingType: e.target.value })); }}
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
                <div style={{ display: "grid", gridTemplateColumns: form.billingType === BILLING_TYPES.monthlyPackage ? "1fr" : "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  {form.billingType !== BILLING_TYPES.monthlyPackage && <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Aulas contratadas</label>
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
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>
                      {form.billingType === BILLING_TYPES.monthlyPackage ? "Valor mensal previsto (R$)" : "Valor do plano (R$)"}
                    </label>
                    <input
                      type="number"
                      value={form.packagePrice}
                      onChange={(e) => { setFormError(""); setForm(f => ({ ...f, packagePrice: e.target.value })); }}
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

                {form.billingType === BILLING_TYPES.monthlyPackage && (
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 10px 0" }}>
                    No pacote mensal, o app calcula as aulas do mes pela agenda do aluno e usa este valor como cobranca prevista.
                  </p>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: form.billingType === BILLING_TYPES.monthly ? "10px" : "0" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Início do ciclo</label>
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
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Vencimento</label>
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
                </div>

                {(form.billingType === BILLING_TYPES.monthly || form.billingType === BILLING_TYPES.monthlyPackage) && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>
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

          <div style={{ marginBottom: "12px", padding: "12px", background: "#fff", border: `1px solid ${theme.light}`, borderRadius: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: theme.primary, margin: "0 0 10px 0" }}>Dados Pessoais (opcional)</p>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>CPF</label>
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
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>E-mail</label>
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
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>WhatsApp</label>
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
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Data de Nascimento</label>
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

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Observações (opcional)</label>
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

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "8px" }}>Horários da Semana</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {DAYS.map((day, dayIdx) => {
                const dayTimes = form.schedule.filter(s => s.day === dayIdx).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={dayIdx} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" }}>
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
              {editId ? "Atualizar" : "Criar"} Aluno
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {students.map(student => {
            const billingStatus = calculateBillingStatus(student, records);
            const billingColors = getBillingStatusColors(billingStatus);
            return (
            <div key={student.id} onClick={() => setSelectedStudentId(student.id)} style={{
              background: "white",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>{student.name}</p>
                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0" }}>
                  {billingStatus.billingTypeLabel} · {formatCurrency(student.pricePerClass)}/aula
                </p>
                {billingStatus.billingType !== BILLING_TYPES.perClass && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                    <span style={{
                      padding: "3px 7px",
                      background: billingColors.background,
                      color: billingColors.color,
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "700"
                    }}>
                      {getBillingStatusLabel(billingStatus)}
                    </span>
                    <span style={{
                      padding: "3px 7px",
                      background: "#eef2ff",
                      color: "#4338ca",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "700"
                    }}>
                      {billingStatus.usedClasses}/{billingStatus.contractedClasses} usadas
                    </span>
                    <span style={{
                      padding: "3px 7px",
                      background: "#f3f4f6",
                      color: "#4b5563",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "700"
                    }}>
                      {billingStatus.remainingClasses} restantes
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#6b7280" }}>
                  {student.phone && <span>📱 {student.phone}</span>}
                  {student.email && <span>✉️ {student.email}</span>}
                </div>
                {student.notes && (
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0", fontStyle: "italic" }}>
                    {student.notes}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(student); }}
                  style={{
                    padding: "6px 10px",
                    background: "#f3f4f6",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#6b7280"
                  }}
                >
                  <IconEdit />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteStudent(student.id); }}
                  style={{
                    padding: "6px 10px",
                    background: "#fee2e2",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#dc2626"
                  }}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
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
