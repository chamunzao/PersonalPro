import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { formatCurrency } from '../../lib/money';
import { formatDate, formatDateISO } from '../../lib/dates';
import { getClassesForDate } from '../schedule/scheduleCalculations';
import { updateAttendanceRecord } from './attendanceActions';

function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}

function IconX() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
// ==================== ATTENDANCE TAB ====================
function AttendanceTab({ students, records, setRecords, scheduleOverrides, loadingData, theme }) {
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
      scheduleType: cls.scheduleType,
      scheduleTypeLabel: cls.scheduleTypeLabel,
      scheduleNote: cls.scheduleNote,
      status: record?.status || null,
      activity: record?.activity || null,
      customPrice: record?.customPrice || null
    });
  });

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
      await updateAttendanceRecord({ user, classKey, status, activity, price, setRecords });

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

  const summary = {
    total: classesForDate.length,
    present: classesForDate.filter(cls => cls.status === "present").length,
    absent: classesForDate.filter(cls => cls.status === "absent").length
  };
  summary.pending = summary.total - summary.present - summary.absent;

  return (
    <div className="attendance-page">
      <section className="app-card attendance-hero-panel">
        <div>
          <p className="dashboard-kicker">REGISTRO DO DIA</p>
          <h2 className="app-page-title">Registro</h2>
          <p className="app-page-kicker">Confirme presença, falta e ajustes de valor sem perder o histórico da aula.</p>
        </div>

        <div className="attendance-date-panel">
        <label className="session-field-label">Data</label>
        <input
          type="date"
          value={selectedDate.split("/").reverse().join("-")}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split("-");
            setSelectedDate(`${day}/${month}/${year}`);
          }}
          className="session-input"
        />
        </div>
      </section>

      <div className="attendance-summary-grid">
        {[
          { label: "Aulas", value: summary.total, tone: "info" },
          { label: "Presentes", value: summary.present, tone: "success" },
          { label: "Faltas", value: summary.absent, tone: "danger" },
          { label: "Pendentes", value: summary.pending, tone: "muted" }
        ].map(item => (
          <div key={item.label} className={`attendance-summary-card attendance-summary-${item.tone}`}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {loadingData && <p style={{ color: "#9ca3af", fontSize: "14px", textAlign: "center" }}>Carregando...</p>}

      {classesForDate.length === 0 ? (
        <div className="app-card attendance-empty">
          <p>Nenhuma aula agendada para este dia</p>
          <span>Altere a data ou cadastre horários na agenda do aluno.</span>
        </div>
      ) : (
        <div className="attendance-list">
          {classesForDate.map(cls => {
            const effectivePrice = cls.customPrice || cls.defaultPrice;
            const isEditing = editingKey === cls.key;
            return (
              <div key={cls.key} className={`attendance-class-card ${cls.status ? `attendance-status-${cls.status}` : ""}`}>
                <div className="attendance-class-header">
                  <div className="attendance-class-copy">
                    <p>{cls.studentName}</p>
                    <span>
                      {cls.time} · {formatCurrency(effectivePrice)}
                      {cls.customPrice ? " (personalizado)" : ""}
                    </span>
                    {cls.activity && (
                      <small>{cls.activity}</small>
                    )}
                  </div>
                  <div className="attendance-action-row">
                    <button
                      onClick={() => updateAttendance(cls.key, cls.status === "present" ? null : "present", undefined, undefined)}
                      disabled={saving}
                      className={`attendance-action-button attendance-present ${cls.status === "present" ? "attendance-action-active" : ""}`}
                      style={{ opacity: saving ? 0.6 : 1 }}
                    >
                      <IconCheck /> Presente
                    </button>
                    <button
                      onClick={() => updateAttendance(cls.key, cls.status === "absent" ? null : "absent", undefined, undefined)}
                      disabled={saving}
                      className={`attendance-action-button attendance-absent ${cls.status === "absent" ? "attendance-action-active" : ""}`}
                      style={{ opacity: saving ? 0.6 : 1 }}
                    >
                      <IconX /> Falta
                    </button>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => startEditCustom(cls)}
                    className="attendance-custom-button"
                  >
                    {cls.activity || cls.customPrice ? "Editar atividade/valor" : "+ Atividade ou valor diferente"}
                  </button>
                )}

                {isEditing && (
                  <div className="attendance-edit-panel">
                    <div>
                      <label className="session-field-label">Atividade</label>
                      <input
                        type="text"
                        value={customActivity}
                        onChange={(e) => setCustomActivity(e.target.value)}
                        placeholder="Ex: Avaliação, treino especial, alongamento..."
                        className="session-input"
                      />
                    </div>
                    <div>
                      <label className="session-field-label">
                        Valor diferente (deixe vazio para usar o padrão: {formatCurrency(cls.defaultPrice)})
                      </label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder={String(cls.defaultPrice)}
                        step="0.01"
                        min="0"
                        className="session-input"
                      />
                    </div>
                    <div className="attendance-edit-actions">
                      <button
                        onClick={() => saveCustomInfo(cls.key)}
                        disabled={saving}
                        className="attendance-save-button"
                      >Salvar</button>
                      <button
                        onClick={cancelEditCustom}
                        className="attendance-secondary-button"
                      >Cancelar</button>
                      {(cls.activity || cls.customPrice) && (
                        <button
                          onClick={() => updateAttendance(cls.key, cls.status || "present", "", "")}
                          disabled={saving}
                          className="attendance-clear-button"
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

export { AttendanceTab };
