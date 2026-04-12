import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
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
} from './firebase';

// ==================== THEME COLORS ====================
const THEMES = {
  purple: { name: "Roxo", primary: "#7c3aed", dark: "#6d28d9", light: "#ede9fe", medium: "#c4b5fd", soft: "#a78bfa", gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" },
  blue: { name: "Azul", primary: "#2563eb", dark: "#1d4ed8", light: "#dbeafe", medium: "#93c5fd", soft: "#60a5fa", gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" },
  pink: { name: "Rosa", primary: "#db2777", dark: "#be185d", light: "#fce7f3", medium: "#f9a8d4", soft: "#f472b6", gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)" },
  green: { name: "Verde", primary: "#059669", dark: "#047857", light: "#d1fae5", medium: "#6ee7b7", soft: "#34d399", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  orange: { name: "Laranja", primary: "#ea580c", dark: "#c2410c", light: "#ffedd5", medium: "#fdba74", soft: "#fb923c", gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)" },
  red: { name: "Vermelho", primary: "#dc2626", dark: "#b91c1c", light: "#fee2e2", medium: "#fca5a5", soft: "#f87171", gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" },
  teal: { name: "Turquesa", primary: "#0d9488", dark: "#0f766e", light: "#ccfbf1", medium: "#5eead4", soft: "#2dd4bf", gradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" },
  slate: { name: "Cinza", primary: "#475569", dark: "#334155", light: "#f1f5f9", medium: "#94a3b8", soft: "#64748b", gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)" },
};

const ThemeContext = React.createContext(THEMES.purple);

function useTheme() {
  return React.useContext(ThemeContext);
}

// ==================== CONSTANTS ====================
const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const DAY_ABBR = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = 6 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

const GYM_FEE_PER_CLASS = 21;
const REVENUE_LIMIT = 5500;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ==================== UTILITIES ====================
function formatCurrency(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year, month, day) {
  return new Date(year, month, day).getDay();
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

// Helper function to convert JS Date to ISO format YYYY-MM-DD
function formatDateISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Helper function to get classes for a specific date, checking overrides
function getClassesForDate(dateISO, students, scheduleOverrides) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return [];
  }

  const classes = [];
  students.forEach(student => {
    // Check for override
    const override = scheduleOverrides.find(
      o => o.date === dateISO && o.studentId === student.id
    );

    let times = [];
    if (override) {
      times = override.times;
    } else {
      // Use base schedule filtered by day of week
      times = student.schedule
        .filter(s => s.day === dayOfWeek - 1)
        .map(s => s.time);
    }

    times.forEach(time => {
      classes.push({
        studentId: student.id,
        studentName: student.name,
        time,
        pricePerClass: student.pricePerClass
      });
    });
  });

  return classes.sort((a, b) => a.time.localeCompare(b.time));
}

// ==================== ICONS ====================
function IconUsers() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconCalendar() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}
function IconClipboard() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>;
}
function IconChart() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
}
function IconCreditCard() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
}
function IconPlus() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;
}
function IconTrash() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
}
function IconEdit() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
}
function IconChevron({ direction }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === "left" ? "rotate(180deg)" : "none" }}><path d="m9 18 6-6-6-6"/></svg>;
}
function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconX() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
function IconLogOut() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
}

// ==================== STUDENTS TAB ====================
function StudentsTab({ students, setStudents, scheduleOverrides, setScheduleOverrides, loadingData }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", pricePerClass: "", schedule: [], notes: "" });
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({ name: "", pricePerClass: "", schedule: [], notes: "" });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(s) {
    setForm({
      name: s.name,
      pricePerClass: String(s.pricePerClass),
      schedule: [...s.schedule.map(x => ({ ...x }))],
      notes: s.notes || ""
    });
    setEditId(s.id);
    setShowForm(true);
  }

  const [newTime, setNewTime] = useState({});

  function addScheduleTime(dayIdx) {
    const time = newTime[dayIdx];
    if (!time) return;
    setForm(f => {
      const exists = f.schedule.find(s => s.day === dayIdx && s.time === time);
      if (exists) return f;
      return { ...f, schedule: [...f.schedule, { day: dayIdx, time }] };
    });
    setNewTime(prev => ({ ...prev, [dayIdx]: "" }));
  }

  function removeScheduleTime(dayIdx, time) {
    setForm(f => ({
      ...f,
      schedule: f.schedule.filter(s => !(s.day === dayIdx && s.time === time))
    }));
  }

  async function saveStudent() {
    if (!form.name.trim() || !form.pricePerClass || form.schedule.length === 0) return;
    if (!user) return;

    setSaving(true);
    try {
      const studentData = {
        name: form.name.trim(),
        pricePerClass: parseFloat(form.pricePerClass),
        schedule: form.schedule,
        notes: form.notes.trim()
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

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
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
              onChange={(e) => setForm(f => ({ ...f, pricePerClass: e.target.value }))}
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
                      <select
                        value={newTime[dayIdx] || ""}
                        onChange={(e) => setNewTime(prev => ({ ...prev, [dayIdx]: e.target.value }))}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontFamily: "inherit",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="">Selecionar horário</option>
                        {HOURS.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addScheduleTime(dayIdx)}
                        disabled={saving}
                        style={{
                          padding: "6px 10px",
                          background: theme.primary,
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        Adicionar
                      </button>
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
                background: theme.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
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

      {!loadingData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {students.map(student => (
            <div key={student.id} style={{
              background: "white",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>{student.name}</p>
                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
                  {formatCurrency(student.pricePerClass)}/aula
                </p>
                {student.notes && (
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0", fontStyle: "italic" }}>
                    {student.notes}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => startEdit(student)}
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
                  onClick={() => deleteStudent(student.id)}
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
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== AGENDA TAB ====================
function AgendaTab({ students, records, scheduleOverrides }) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getDayOfWeek(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const days = [];
  for (let i = 0; i < firstDay - 1; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getClassesForDay = (dayNum) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const dateISO = formatDateISO(date);
    const classes = getClassesForDate(dateISO, students, scheduleOverrides);

    return classes.map(cls => {
      const key = `${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}_${cls.studentId}_${cls.time}`;
      const attendance = records.find(r => r.key === key)?.status || null;
      return { ...cls, key, attendance };
    });
  };

  const getTodayClasses = () => {
    const today = new Date();
    const todayISO = formatDateISO(today);
    const classes = getClassesForDate(todayISO, students, scheduleOverrides);

    return classes.map(cls => {
      const key = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}_${cls.studentId}_${cls.time}`;
      const attendance = records.find(r => r.key === key)?.status || null;
      return { ...cls, key, attendance };
    });
  };

  const getTodayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const todayClasses = getTodayClasses();

  return (
    <div style={{ padding: "16px" }}>
      {/* Today's Summary */}
      <div style={{
        background: theme.gradient,
        color: "white",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 8px 0" }}>
          {getTodayGreeting()}, Instrutor!
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "12px", opacity: 0.9, margin: "0" }}>Aulas Hoje</p>
            <p style={{ fontSize: "20px", fontWeight: "700", margin: "4px 0 0 0" }}>{todayClasses.length}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", opacity: 0.9, margin: "0" }}>Total de Alunos</p>
            <p style={{ fontSize: "20px", fontWeight: "700", margin: "4px 0 0 0" }}>{students.length}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0", color: "#1f2937" }}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            style={{
              padding: "6px 10px",
              background: "#f3f4f6",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              padding: "6px 10px",
              background: theme.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600"
            }}
          >
            Hoje
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            style={{
              padding: "6px 10px",
              background: "#f3f4f6",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Próximo
          </button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "8px",
        marginBottom: "20px"
      }}>
        {DAY_ABBR.map(day => (
          <div key={day} style={{
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "600",
            color: theme.primary,
            padding: "8px"
          }}>
            {day}
          </div>
        ))}
        {days.map((dayNum, idx) => {
          const classesForDay = dayNum ? getClassesForDay(dayNum) : [];
          const isToday = dayNum === new Date().getDate() &&
                          currentDate.getMonth() === new Date().getMonth() &&
                          currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={idx}
              onClick={() => dayNum && classesForDay.length > 0 && setSelectedDayModal(dayNum)}
              style={{
                background: dayNum === null ? "transparent" : (isToday ? "#f3f4f6" : "white"),
                border: dayNum === null ? "none" : "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "8px",
                minHeight: "60px",
                display: "flex",
                flexDirection: "column",
                cursor: dayNum && classesForDay.length > 0 ? "pointer" : "default",
                transition: dayNum && classesForDay.length > 0 ? "all 0.2s" : "none",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (dayNum && classesForDay.length > 0) {
                  e.currentTarget.style.boxShadow = `0 2px 8px ${theme.light}`;
                  e.currentTarget.style.borderColor = theme.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (dayNum && classesForDay.length > 0) {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }
              }}
            >
              {dayNum && (
                <>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#1f2937", margin: "0 0 6px 0" }}>{dayNum}</p>
                  <div style={{ fontSize: "10px", color: "#6b7280", flex: 1 }}>
                    {classesForDay.length > 0 ? (
                      <>
                        <span>{classesForDay.length} aula(s)</span>
                        <div style={{ marginTop: "4px", display: "flex", gap: "3px", flexWrap: "wrap" }}>
                          {classesForDay.map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                background: theme.primary
                              }}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: "#d1d5db" }}>-</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Details Modal */}
      {selectedDayModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            width: "100%",
            maxHeight: "80vh",
            borderRadius: "16px 16px 0 0",
            padding: "20px",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0", color: "#1f2937" }}>
                {DAYS[getDayOfWeek(currentDate.getFullYear(), currentDate.getMonth(), selectedDayModal) - 1]} - {selectedDayModal} de {MONTHS[currentDate.getMonth()]}
              </h3>
              <button
                onClick={() => setSelectedDayModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
              </button>
            </div>

            <DayDetailsPanel
              dayNum={selectedDayModal}
              currentDate={currentDate}
              students={students}
              records={records}
              scheduleOverrides={scheduleOverrides}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Day Details Panel Component
function DayDetailsPanel({ dayNum, currentDate, students, records, scheduleOverrides, theme }) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
  const dateISO = formatDateISO(date);
  const classes = getClassesForDate(dateISO, students, scheduleOverrides);

  const classesWithAttendance = classes.map(cls => {
    const key = `${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}_${cls.studentId}_${cls.time}`;
    const attendance = records.find(r => r.key === key)?.status || null;
    return { ...cls, key, attendance };
  });

  if (classesWithAttendance.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
        <p>Nenhuma aula agendada para este dia</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {classesWithAttendance.map(cls => (
        <div key={cls.key} style={{
          background: "#f9fafb",
          padding: "12px",
          borderRadius: "8px",
          border: `1px solid ${theme.light}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>
                {cls.studentName}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
                {cls.time} · {formatCurrency(cls.pricePerClass)}
              </p>
            </div>
            {cls.attendance && (
              <span style={{
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
                background: cls.attendance === "present" ? "#d1fae5" : "#fee2e2",
                color: cls.attendance === "present" ? "#059669" : "#dc2626"
              }}>
                {cls.attendance === "present" ? "Presente" : "Ausente"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== ATTENDANCE TAB ====================
function AttendanceTab({ students, records, setRecords, scheduleOverrides, loadingData }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [customActivity, setCustomActivity] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const dateObj = new Date(selectedDate.split("/").reverse().join("-"));
  const dayOfWeek = dateObj.getDay();
  const dateISO = formatDateISO(dateObj);

  const classesForDate = [];

  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    const classes = getClassesForDate(dateISO, students, scheduleOverrides);
    classes.forEach(cls => {
      const key = `${selectedDate.split("/")[0]}/${selectedDate.split("/")[1]}/${selectedDate.split("/")[2]}_${cls.studentId}_${cls.time}`;
      const record = records.find(r => r.key === key);
      classesForDate.push({
        key,
        studentId: cls.studentId,
        studentName: cls.studentName,
        time: cls.time,
        defaultPrice: cls.pricePerClass,
        status: record?.status || null,
        activity: record?.activity || null,
        customPrice: record?.customPrice || null
      });
    });
  }

  classesForDate.sort((a, b) => a.time.localeCompare(b.time));

  function startEditCustom(cls) {
    setEditingKey(cls.key);
    setCustomActivity(cls.activity || "");
    setCustomPrice(cls.customPrice ? String(cls.customPrice) : "");
  }

  function cancelEditCustom() {
    setEditingKey(null);
    setCustomActivity("");
    setCustomPrice("");
  }

  async function updateAttendance(classKey, status, activity, price) {
    if (!user) return;
    setSaving(true);

    try {
      const parts = classKey.split("_");
      const date = parts[0];
      const studentId = parts[1];
      const time = parts.slice(2).join("_");

      const recordKey = `${date}_${studentId}_${time}`;
      const recordDoc = doc(db, `users/${user.uid}/records/${recordKey}`);

      if (status === null) {
        const docSnap = await getDoc(recordDoc);
        if (docSnap.exists()) {
          await deleteDoc(recordDoc);
        }
      } else {
        const data = { status };
        if (activity !== undefined) data.activity = activity || null;
        if (price !== undefined) data.customPrice = price ? parseFloat(price) : null;
        await setDoc(recordDoc, data, { merge: true });
      }

      setRecords(prev => {
        const existing = prev.findIndex(r => r.key === classKey);
        const newRecord = {
          key: classKey,
          status,
          activity: activity !== undefined ? (activity || null) : (existing >= 0 ? prev[existing].activity : null),
          customPrice: price !== undefined ? (price ? parseFloat(price) : null) : (existing >= 0 ? prev[existing].customPrice : null)
        };
        if (status === null) {
          return existing >= 0 ? prev.filter((_, i) => i !== existing) : prev;
        }
        if (existing >= 0) {
          const newRecords = [...prev];
          newRecords[existing] = newRecord;
          return newRecords;
        }
        return [...prev, newRecord];
      });

      if (editingKey === classKey) cancelEditCustom();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Erro ao atualizar presença");
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomInfo(classKey) {
    const record = records.find(r => r.key === classKey);
    const currentStatus = record?.status || "present";
    await updateAttendance(classKey, currentStatus, customActivity, customPrice);
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Registro de Presenças</h2>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Data</label>
        <input
          type="date"
          value={selectedDate.split("/").reverse().join("-")}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split("-");
            setSelectedDate(`${day}/${month}/${year}`);
          }}
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

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      {dayOfWeek === 0 || dayOfWeek === 6 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#9ca3af"
        }}>
          <p style={{ fontSize: "14px", margin: "0" }}>Nenhuma aula neste dia (fim de semana)</p>
        </div>
      ) : classesForDate.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#9ca3af"
        }}>
          <p style={{ fontSize: "14px", margin: "0" }}>Nenhuma aula agendada para este dia</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {classesForDate.map(cls => {
            const effectivePrice = cls.customPrice || cls.defaultPrice;
            const isEditing = editingKey === cls.key;
            return (
              <div key={cls.key} style={{
                background: "white",
                padding: "12px",
                borderRadius: "8px",
                border: cls.activity ? `1px solid ${theme.medium}` : "1px solid #e5e7eb"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>{cls.studentName}</p>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
                      {cls.time} · {formatCurrency(effectivePrice)}
                      {cls.customPrice ? " (personalizado)" : ""}
                    </p>
                    {cls.activity && (
                      <span style={{
                        display: "inline-block", marginTop: "4px", padding: "2px 8px",
                        background: theme.light, color: theme.dark, borderRadius: "4px",
                        fontSize: "11px", fontWeight: "600"
                      }}>
                        {cls.activity}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => updateAttendance(cls.key, cls.status === "present" ? null : "present", undefined, undefined)}
                      disabled={saving}
                      style={{
                        padding: "8px 12px",
                        background: cls.status === "present" ? "#d1fae5" : "#f3f4f6",
                        color: cls.status === "present" ? "#059669" : "#6b7280",
                        border: "none", borderRadius: "6px", fontSize: "12px",
                        fontWeight: "600", cursor: saving ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "4px",
                        opacity: saving ? 0.6 : 1
                      }}
                    >
                      <IconCheck /> Presente
                    </button>
                    <button
                      onClick={() => updateAttendance(cls.key, cls.status === "absent" ? null : "absent", undefined, undefined)}
                      disabled={saving}
                      style={{
                        padding: "8px 12px",
                        background: cls.status === "absent" ? "#fee2e2" : "#f3f4f6",
                        color: cls.status === "absent" ? "#dc2626" : "#6b7280",
                        border: "none", borderRadius: "6px", fontSize: "12px",
                        fontWeight: "600", cursor: saving ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "4px",
                        opacity: saving ? 0.6 : 1
                      }}
                    >
                      <IconX /> Ausente
                    </button>
                  </div>
                </div>

                {/* Botão personalizar */}
                {!isEditing && (
                  <button
                    onClick={() => startEditCustom(cls)}
                    style={{
                      marginTop: "8px", padding: "4px 10px",
                      background: "none", border: `1px dashed ${theme.medium}`,
                      borderRadius: "6px", color: theme.primary, fontSize: "11px",
                      fontWeight: "600", cursor: "pointer", width: "100%"
                    }}
                  >
                    {cls.activity || cls.customPrice ? "Editar atividade/valor" : "+ Atividade ou valor diferente"}
                  </button>
                )}

                {/* Formulário de personalização */}
                {isEditing && (
                  <div style={{
                    marginTop: "10px", padding: "10px", background: "#f9fafb",
                    borderRadius: "8px", border: "1px solid #e5e7eb"
                  }}>
                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "3px" }}>Atividade</label>
                      <input
                        type="text"
                        value={customActivity}
                        onChange={(e) => setCustomActivity(e.target.value)}
                        placeholder="Ex: Avaliação, Treino especial, Alongamento..."
                        style={{
                          width: "100%", padding: "7px 10px", border: "1px solid #d1d5db",
                          borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit"
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "3px" }}>
                        Valor diferente (deixe vazio para usar o padrão: {formatCurrency(cls.defaultPrice)})
                      </label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder={String(cls.defaultPrice)}
                        step="0.01"
                        min="0"
                        style={{
                          width: "100%", padding: "7px 10px", border: "1px solid #d1d5db",
                          borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", fontFamily: "inherit"
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => saveCustomInfo(cls.key)}
                        disabled={saving}
                        style={{
                          flex: 1, padding: "8px", background: theme.primary, color: "white",
                          border: "none", borderRadius: "6px", fontSize: "12px",
                          fontWeight: "600", cursor: "pointer"
                        }}
                      >Salvar</button>
                      <button
                        onClick={cancelEditCustom}
                        style={{
                          padding: "8px 14px", background: "#f3f4f6", color: "#6b7280",
                          border: "none", borderRadius: "6px", fontSize: "12px",
                          fontWeight: "600", cursor: "pointer"
                        }}
                      >Cancelar</button>
                      {(cls.activity || cls.customPrice) && (
                        <button
                          onClick={() => updateAttendance(cls.key, cls.status || "present", "", "")}
                          disabled={saving}
                          style={{
                            padding: "8px 14px", background: "#fee2e2", color: "#dc2626",
                            border: "none", borderRadius: "6px", fontSize: "12px",
                            fontWeight: "600", cursor: "pointer"
                          }}
                        >Limpar</button>
                      )}
                    </div>
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

// ==================== PAYMENTS TAB ====================
function PaymentsTab({ students, payments, setPayments, loadingData }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const handlePaymentToggle = async (studentId, isPaid) => {
    if (!user) return;
    setSaving(true);

    try {
      const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const paymentKey = `${monthKey}_${studentId}`;

      if (isPaid) {
        const paymentDoc = doc(db, `users/${user.uid}/payments/${paymentKey}`);
        await deleteDoc(paymentDoc);
        setPayments(prev => prev.filter(p => p.key !== paymentKey));
      } else {
        const paymentDoc = doc(db, `users/${user.uid}/payments/${paymentKey}`);
        await setDoc(paymentDoc, {
          paid: true,
          date: formatDate(new Date()),
          month: monthKey
        });
        setPayments(prev => {
          const existing = prev.findIndex(p => p.key === paymentKey);
          if (existing >= 0) {
            return prev;
          }
          return [...prev, { key: paymentKey, paid: true, date: formatDate(new Date()) }];
        });
      }
    } catch (error) {
      console.error("Error toggling payment:", error);
      alert("Erro ao atualizar pagamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Controle de Pagamentos</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      {students.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#9ca3af"
        }}>
          <p style={{ fontSize: "14px", margin: "0" }}>Nenhum aluno cadastrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {students.map(student => {
            const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
            const paymentKey = `${monthKey}_${student.id}`;
            const payment = payments.find(p => p.key === paymentKey);
            const isPaid = !!payment;

            return (
              <div key={student.id} style={{
                background: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>{student.name}</p>
                  <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
                    {isPaid ? `Pago em ${payment.date}` : "Pendente"}
                  </p>
                </div>
                <button
                  onClick={() => handlePaymentToggle(student.id, isPaid)}
                  disabled={saving}
                  style={{
                    padding: "8px 12px",
                    background: isPaid ? "#d1fae5" : "#fee2e2",
                    color: isPaid ? "#059669" : "#dc2626",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {isPaid ? "Pago" : "Pendente"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== REPORTS TAB ====================
function ReportsTab({ students, records, payments, loadingData }) {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const monthPayments = payments.filter(p => p.month === monthKey);

  const monthRecords = records.filter(r => {
    const [date] = r.key.split("_");
    const [day, month, year] = date.split("/");
    return parseInt(month) === selectedMonth + 1 && parseInt(year) === selectedYear;
  });

  const totalClasses = monthRecords.length;
  const presentClasses = monthRecords.filter(r => r.status === "present").length;
  const absenceRate = totalClasses > 0 ? ((totalClasses - presentClasses) / totalClasses * 100).toFixed(1) : 0;

  const totalRevenue = monthPayments.length * 280; // Example calculation
  const gymFees = totalClasses * GYM_FEE_PER_CLASS;
  const netRevenue = totalRevenue - gymFees;
  const revenuePercentage = totalRevenue > 0 ? (netRevenue / totalRevenue * 100).toFixed(0) : 0;

  const studentsWithPayment = monthPayments.length;
  const totalStudents = students.length;
  const paymentRate = totalStudents > 0 ? ((studentsWithPayment / totalStudents) * 100).toFixed(0) : 0;

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Relatório</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "6px" }}>Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Total de Aulas</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{totalClasses}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{presentClasses} presentes ({100 - absenceRate}%)</p>
        </div>

        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de Falta</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: "#dc2626" }}>{absenceRate}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{totalClasses - presentClasses} faltas</p>
        </div>

        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Receita Líquida</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{formatCurrency(netRevenue)}</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{revenuePercentage}% após fees</p>
        </div>

        <div style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px 0", fontWeight: "600" }}>Taxa de Pagamento</p>
          <p style={{ fontSize: "28px", fontWeight: "700", margin: "0", color: theme.primary }}>{paymentRate}%</p>
          <p style={{ fontSize: "11px", color: "#d1d5db", margin: "6px 0 0 0" }}>{studentsWithPayment}/{totalStudents} alunos</p>
        </div>
      </div>

      <div style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px 0", color: "#1f2937" }}>Detalhamento por Aluno</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {students.map(student => {
            const studentRecords = monthRecords.filter(r => r.key.includes(`_${student.id}_`));
            const studentPresent = studentRecords.filter(r => r.status === "present").length;
            const paid = monthPayments.find(p => p.key === `${monthKey}_${student.id}`);

            return (
              <div key={student.id} style={{
                padding: "10px",
                background: "#f9fafb",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px"
              }}>
                <div>
                  <p style={{ fontWeight: "600", margin: "0 0 2px 0", color: "#1f2937" }}>{student.name}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0" }}>
                    {studentRecords.length} aulas ({studentPresent} presentes)
                  </p>
                </div>
                <span style={{
                  padding: "4px 8px",
                  background: paid ? "#d1fae5" : "#fee2e2",
                  color: paid ? "#059669" : "#dc2626",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "600"
                }}>
                  {paid ? "Pago" : "Pendente"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== SETTINGS TAB ====================
function SettingsTab({ themeKey, setThemeKey }) {
  const { user } = useAuth();

  async function changeTheme(key) {
    setThemeKey(key);
    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}/settings/theme`), { themeKey: key });
      } catch (e) {
        console.error("Error saving theme:", e);
      }
    }
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Configurações</h2>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "10px" }}>Cor do tema</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => changeTheme(key)}
              style={{
                padding: "12px 8px",
                background: themeKey === key ? t.light : "#f9fafb",
                border: themeKey === key ? `2px solid ${t.primary}` : "1px solid #e5e7eb",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: t.gradient, boxShadow: themeKey === key ? `0 0 0 3px ${t.light}` : "none"
              }} />
              <span style={{ fontSize: "11px", fontWeight: "600", color: themeKey === key ? t.primary : "#6b7280" }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconSettings() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

// ==================== MAIN APP ====================
export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [themeKey, setThemeKey] = useState("purple");
  const theme = THEMES[themeKey] || THEMES.purple;

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        // Load theme
        const themeSnap = await getDoc(doc(db, `users/${user.uid}/settings/theme`));
        if (themeSnap.exists() && themeSnap.data().themeKey) {
          setThemeKey(themeSnap.data().themeKey);
        }

        // Load students
        const studentsSnap = await getDocs(collection(db, `users/${user.uid}/students`));
        const studentsData = studentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);

        // Load records
        const recordsSnap = await getDocs(collection(db, `users/${user.uid}/records`));
        const recordsData = recordsSnap.docs.map(doc => ({
          key: doc.id,
          status: doc.data().status,
          activity: doc.data().activity || null,
          customPrice: doc.data().customPrice || null
        }));
        setRecords(recordsData);

        // Load payments
        const paymentsSnap = await getDocs(collection(db, `users/${user.uid}/payments`));
        const paymentsData = paymentsSnap.docs.map(doc => ({
          key: doc.id,
          ...doc.data()
        }));
        setPayments(paymentsData);

        // Load schedule overrides
        const overridesSnap = await getDocs(collection(db, `users/${user.uid}/scheduleOverrides`));
        const overridesData = overridesSnap.docs.map(doc => ({
          key: doc.id,
          date: doc.id.split("_")[0],
          studentId: doc.id.split("_")[1],
          ...doc.data()
        }));
        setScheduleOverrides(overridesData);
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Erro ao carregar dados");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const { logout } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.gradient,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <p style={{ color: "white", fontSize: "16px" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeContext.Provider value={theme}>
        <LoginPage />
      </ThemeContext.Provider>
    );
  }

  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      try {
        await logout();
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{
        background: theme.gradient,
        color: "white",
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px 0" }}>PersonalPro</h1>
          <p style={{ fontSize: "12px", margin: "0", opacity: 0.9 }}>{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.2)";
          }}
        >
          <IconLogOut /> Sair
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "students" && <StudentsTab students={students} setStudents={setStudents} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} loadingData={loadingData} />}
        {activeTab === "agenda" && <AgendaTab students={students} records={records} scheduleOverrides={scheduleOverrides} />}
        {activeTab === "attendance" && <AttendanceTab students={students} records={records} setRecords={setRecords} scheduleOverrides={scheduleOverrides} loadingData={loadingData} />}
        {activeTab === "payments" && <PaymentsTab students={students} payments={payments} setPayments={setPayments} loadingData={loadingData} />}
        {activeTab === "reports" && <ReportsTab students={students} records={records} payments={payments} loadingData={loadingData} />}
        {activeTab === "settings" && <SettingsTab themeKey={themeKey} setThemeKey={setThemeKey} />}
      </div>

      {/* Bottom Tab Navigation */}
      <div style={{
        background: "white",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "0",
        padding: "8px",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)"
      }}>
        {[
          { id: "students", icon: <IconUsers />, label: "Alunos" },
          { id: "agenda", icon: <IconCalendar />, label: "Agenda" },
          { id: "attendance", icon: <IconClipboard />, label: "Registro" },
          { id: "payments", icon: <IconCreditCard />, label: "Pagamentos" },
          { id: "reports", icon: <IconChart />, label: "Relatório" },
          { id: "settings", icon: <IconSettings />, label: "Config" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: activeTab === tab.id ? "#f3f4f6" : "transparent",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: "600",
              color: activeTab === tab.id ? theme.primary : "#9ca3af",
              transition: "all 0.2s"
            }}
          >
            <span style={{ fontSize: "18px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
    </ThemeContext.Provider>
  );
}
