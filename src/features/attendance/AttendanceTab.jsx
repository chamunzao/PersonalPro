import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  db,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from '../../firebase';
import { formatCurrency } from '../../lib/money';
import { formatDate, formatDateISO } from '../../lib/dates';
import { getClassesForDate } from '../schedule/scheduleCalculations';

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

      {classesForDate.length === 0 ? (
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

export { AttendanceTab };
