import React, { useState } from "react";
import { db, doc, setDoc } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { DAYS, DAY_ABBR, MONTHS } from "../../lib/constants";
import { formatCurrency } from "../../lib/money";
import { formatDateISO, getDaysInMonth, getDayOfWeek, jsDayToIndex } from "../../lib/dates";
import {
  SCHEDULE_ITEM_TYPES,
  buildScheduleOverridePayload,
  getClassesForDate,
  getScheduleItemsForStudent,
  getScheduleItemTypeLabel,
  getScheduleOverrideId
} from "./scheduleCalculations";
import { getAttendanceStatusStyle, updateAttendanceRecord } from "../attendance/attendanceActions";

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    alert("Cadastre o WhatsApp do aluno para usar esta acao.");
    return;
  }
  const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function getWeekStart(date) {
  const start = new Date(date);
  const dayIndex = jsDayToIndex(start.getDay());
  start.setDate(start.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDateText(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function AgendaTab({ students, records, setRecords, scheduleOverrides, setScheduleOverrides, locations = [], theme }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayJS = getDayOfWeek(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const firstDayIdx = jsDayToIndex(firstDayJS);

  const days = [];
  for (let i = 0; i < firstDayIdx; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getClassesForDay = (dayNum) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const dateISO = formatDateISO(date);
    const classes = getClassesForDate(dateISO, students, scheduleOverrides, locations);

    return classes.map(cls => {
      const key = `${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}_${cls.studentId}_${cls.time}`;
      const attendance = records.find(r => r.key === key)?.status || null;
      return { ...cls, key, attendance };
    });
  };

  const getClassesForDateObject = (date) => {
    const dateISO = formatDateISO(date);
    const dateText = getDateText(date);
    const classes = getClassesForDate(dateISO, students, scheduleOverrides, locations);

    return classes.map(cls => {
      const key = `${dateText}_${cls.studentId}_${cls.time}`;
      const attendance = records.find(r => r.key === key)?.status || null;
      return { ...cls, key, attendance };
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = getWeekStart(currentDate);
    date.setDate(date.getDate() + index);
    return date;
  });

  const weekClasses = weekDays.flatMap(date => getClassesForDateObject(date));
  const weekSummary = {
    total: weekClasses.length,
    present: weekClasses.filter(cls => cls.attendance === "present").length,
    absent: weekClasses.filter(cls => cls.attendance === "absent").length,
    pending: weekClasses.filter(cls => !cls.attendance).length
  };

  const getTodayClasses = () => {
    const today = new Date();
    const todayISO = formatDateISO(today);
    const classes = getClassesForDate(todayISO, students, scheduleOverrides, locations);

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
          {viewMode === "month"
            ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            : `${getDateText(weekDays[0])} - ${getDateText(weekDays[6])}`}
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              if (viewMode === "month") {
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
              } else {
                const previousWeek = new Date(currentDate);
                previousWeek.setDate(previousWeek.getDate() - 7);
                setCurrentDate(previousWeek);
              }
            }}
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
            onClick={() => {
              if (viewMode === "month") {
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
              } else {
                const nextWeek = new Date(currentDate);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setCurrentDate(nextWeek);
              }
            }}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        {[
          { key: "month", label: "Mes" },
          { key: "week", label: "Semana" }
        ].map(option => (
          <button
            key={option.key}
            onClick={() => setViewMode(option.key)}
            style={{
              padding: "9px",
              background: viewMode === option.key ? theme.primary : "white",
              color: viewMode === option.key ? "white" : theme.primary,
              border: `1px solid ${theme.medium}`,
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer"
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {viewMode === "week" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "Aulas", value: weekSummary.total, color: theme.primary },
            { label: "Pendentes", value: weekSummary.pending, color: "#6b7280" },
            { label: "Presentes", value: weekSummary.present, color: "#059669" },
            { label: "Faltas", value: weekSummary.absent, color: "#dc2626" }
          ].map(item => (
            <div key={item.label} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px" }}>
              <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 4px", fontWeight: "700" }}>{item.label}</p>
              <p style={{ fontSize: "20px", color: item.color, margin: 0, fontWeight: "800" }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {viewMode === "month" ? (
        <MonthCalendar
          days={days}
          currentDate={currentDate}
          getClassesForDay={getClassesForDay}
          setSelectedDayModal={setSelectedDayModal}
          theme={theme}
        />
      ) : (
        <WeekCalendar
          weekDays={weekDays}
          getClassesForDateObject={getClassesForDateObject}
          setCurrentDate={setCurrentDate}
          setSelectedDayModal={setSelectedDayModal}
          theme={theme}
        />
      )}

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
              setRecords={setRecords}
              scheduleOverrides={scheduleOverrides}
              setScheduleOverrides={setScheduleOverrides}
              locations={locations}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MonthCalendar({ days, currentDate, getClassesForDay, setSelectedDayModal, theme }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
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
            onClick={() => dayNum && setSelectedDayModal(dayNum)}
            style={{
              background: dayNum === null ? "transparent" : (isToday ? "#f3f4f6" : "white"),
              border: dayNum === null ? "none" : "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "8px",
              minHeight: "60px",
              display: "flex",
              flexDirection: "column",
              cursor: dayNum ? "pointer" : "default",
              transition: dayNum ? "all 0.2s" : "none",
              position: "relative"
            }}
            onMouseEnter={(e) => {
              if (dayNum) {
                e.currentTarget.style.boxShadow = `0 2px 8px ${theme.light}`;
                e.currentTarget.style.borderColor = theme.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (dayNum) {
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
                        {classesForDay.map((cls, i) => {
                          const color = cls.attendance === "present" ? "#059669" : cls.attendance === "absent" ? "#dc2626" : theme.primary;
                          return (
                            <div
                              key={i}
                              style={{
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                background: color
                              }}
                            />
                          );
                        })}
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
  );
}

function WeekCalendar({ weekDays, getClassesForDateObject, setCurrentDate, setSelectedDayModal, theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
      {weekDays.map(date => {
        const classes = getClassesForDateObject(date);
        const isToday = getDateText(date) === getDateText(new Date());
        return (
          <button
            key={date.toISOString()}
            onClick={() => {
              setCurrentDate(date);
              setSelectedDayModal(date.getDate());
            }}
            style={{
              background: isToday ? "#f3f4f6" : "white",
              border: `1px solid ${isToday ? theme.medium : "#e5e7eb"}`,
              borderRadius: "8px",
              padding: "12px",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: classes.length > 0 ? "8px" : "0" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "800", color: "#1f2937", margin: "0 0 2px" }}>{DAYS[jsDayToIndex(date.getDay())]}</p>
                <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>{getDateText(date)}</p>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "800", color: theme.primary }}>{classes.length} aula(s)</span>
            </div>
            {classes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {classes.map(cls => {
                  const statusStyle = getAttendanceStatusStyle(cls.attendance, theme);
                  return (
                    <div key={cls.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", background: "#f9fafb", borderRadius: "6px", padding: "7px" }}>
                      <span style={{ fontSize: "12px", color: "#1f2937", fontWeight: "700" }}>{cls.time} - {cls.studentName}</span>
                      <span style={{ fontSize: "10px", color: statusStyle.color, background: statusStyle.background, borderRadius: "4px", padding: "3px 6px", fontWeight: "800" }}>{statusStyle.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayDetailsPanel({ dayNum, currentDate, students, records, setRecords, scheduleOverrides, setScheduleOverrides, locations = [], theme }) {
  const { user } = useAuth();
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
  const dateISO = formatDateISO(date);
  const dateLabel = `${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}`;
  const classes = getClassesForDate(dateISO, students, scheduleOverrides, locations);
  const [showAddClass, setShowAddClass] = useState(false);
  const [addForm, setAddForm] = useState({ studentId: "", time: "", type: SCHEDULE_ITEM_TYPES.extra, note: "", pricePerClass: "", locationId: "" });
  const [rescheduleKey, setRescheduleKey] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingAttendanceKey, setSavingAttendanceKey] = useState(null);

  const classesWithAttendance = classes.map(cls => {
    const key = `${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}_${cls.studentId}_${cls.time}`;
    const attendance = records.find(r => r.key === key)?.status || null;
    return { ...cls, key, attendance };
  });

  function getOverride(studentId) {
    return scheduleOverrides.find(item => item.date === dateISO && item.studentId === studentId);
  }

  async function quickUpdateAttendance(cls, status) {
    if (!user) return;
    const nextStatus = cls.attendance === status ? null : status;
    setSavingAttendanceKey(cls.key);
    try {
      await updateAttendanceRecord({ user, classKey: cls.key, status: nextStatus, setRecords });
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Erro ao atualizar presenca");
    } finally {
      setSavingAttendanceKey(null);
    }
  }

  async function saveStudentScheduleItems(student, items, targetDateISO = dateISO) {
    if (!user) return;
    const overrideId = getScheduleOverrideId(targetDateISO, student.id);
    const payload = buildScheduleOverridePayload(items);
    await setDoc(doc(db, `users/${user.uid}/scheduleOverrides/${overrideId}`), payload);

    setScheduleOverrides(prev => {
      const nextOverride = {
        key: overrideId,
        date: targetDateISO,
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

  async function addScheduleItem() {
    if (!addForm.studentId || !addForm.time) return;
    const student = students.find(item => item.id === addForm.studentId);
    if (!student) return;

    setSavingSchedule(true);
    try {
      const currentItems = getScheduleItemsForStudent(dateISO, student, getOverride(student.id));
      if (currentItems.some(item => item.time === addForm.time)) {
        alert("Este aluno já tem uma aula nesse horário.");
        return;
      }

      const nextItems = [
        ...currentItems,
        {
          time: addForm.time,
          type: addForm.type,
          note: addForm.note.trim(),
          pricePerClass: addForm.pricePerClass ? parseFloat(addForm.pricePerClass) : null,
          locationId: addForm.locationId || student.defaultLocationId || ""
        }
      ];
      await saveStudentScheduleItems(student, nextItems);
      setAddForm({ studentId: "", time: "", type: SCHEDULE_ITEM_TYPES.extra, note: "", pricePerClass: "", locationId: "" });
      setShowAddClass(false);
    } catch (error) {
      console.error("Error saving schedule item:", error);
      alert("Erro ao salvar aula na agenda");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function cancelClass(cls) {
    if (!window.confirm("Cancelar esta aula apenas neste dia?")) return;
    const student = students.find(item => item.id === cls.studentId);
    if (!student) return;

    setSavingSchedule(true);
    try {
      const currentItems = getScheduleItemsForStudent(dateISO, student, getOverride(student.id));
      await saveStudentScheduleItems(student, currentItems.filter(item => item.time !== cls.time));
    } catch (error) {
      console.error("Error canceling class:", error);
      alert("Erro ao cancelar aula");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function rescheduleClass(cls) {
    if (!rescheduleForm.date || !rescheduleForm.time) return;
    const student = students.find(item => item.id === cls.studentId);
    if (!student) return;

    setSavingSchedule(true);
    try {
      const targetOverride = scheduleOverrides.find(item => item.date === rescheduleForm.date && item.studentId === student.id);
      const targetItems = getScheduleItemsForStudent(rescheduleForm.date, student, targetOverride);
      const isSameSlot = rescheduleForm.date === dateISO && rescheduleForm.time === cls.time;
      if (isSameSlot) {
        setRescheduleKey(null);
        return;
      }
      if (!isSameSlot && targetItems.some(item => item.time === rescheduleForm.time)) {
        alert("Este aluno já tem aula no novo horário.");
        return;
      }

      const sourceItems = getScheduleItemsForStudent(dateISO, student, getOverride(student.id));
      await saveStudentScheduleItems(student, sourceItems.filter(item => item.time !== cls.time));

      await saveStudentScheduleItems(student, [
        ...targetItems,
        {
          time: rescheduleForm.time,
          type: SCHEDULE_ITEM_TYPES.rescheduled,
          note: `Remarcada de ${String(dayNum).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}`,
          pricePerClass: cls.pricePerClass,
          locationId: cls.locationId || student.defaultLocationId || ""
        }
      ], rescheduleForm.date);
      setRescheduleKey(null);
      setRescheduleForm({ date: "", time: "" });
    } catch (error) {
      console.error("Error rescheduling class:", error);
      alert("Erro ao remarcar aula");
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <button
        onClick={() => setShowAddClass(!showAddClass)}
        style={{
          padding: "10px 12px",
          background: theme.primary,
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer"
        }}
      >
        {showAddClass ? "Fechar" : "+ Aula avulsa/reposição"}
      </button>

      {showAddClass && (
        <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <select
              value={addForm.studentId}
              onChange={(e) => setAddForm(form => ({ ...form, studentId: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
            >
              <option value="">Aluno</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
            <input
              type="time"
              value={addForm.time}
              onChange={(e) => setAddForm(form => ({ ...form, time: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
            />
            <select
              value={addForm.type}
              onChange={(e) => setAddForm(form => ({ ...form, type: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
            >
              <option value={SCHEDULE_ITEM_TYPES.extra}>Avulsa</option>
              <option value={SCHEDULE_ITEM_TYPES.replacement}>Reposição</option>
              <option value={SCHEDULE_ITEM_TYPES.rescheduled}>Remarcada</option>
            </select>
            <input
              type="number"
              value={addForm.pricePerClass}
              onChange={(e) => setAddForm(form => ({ ...form, pricePerClass: e.target.value }))}
              placeholder="Valor opcional"
              min="0"
              step="0.01"
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
            />
          </div>
          <input
            type="text"
            value={addForm.note}
            onChange={(e) => setAddForm(form => ({ ...form, note: e.target.value }))}
            placeholder="Observação opcional"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", marginBottom: "8px" }}
          />
          <select
            value={addForm.locationId}
            onChange={(e) => setAddForm(form => ({ ...form, locationId: e.target.value }))}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", marginBottom: "8px", background: "white" }}
          >
            <option value="">Local padrão do aluno</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          <button
            onClick={addScheduleItem}
            disabled={savingSchedule || !addForm.studentId || !addForm.time}
            style={{
              width: "100%",
              padding: "8px",
              background: savingSchedule || !addForm.studentId || !addForm.time ? "#d1d5db" : theme.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: savingSchedule || !addForm.studentId || !addForm.time ? "not-allowed" : "pointer"
            }}
          >
            Salvar aula
          </button>
        </div>
      )}

      {classesWithAttendance.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", background: "#f9fafb", borderRadius: "8px" }}>
          <p>Nenhuma aula agendada para este dia</p>
        </div>
      )}

      {classesWithAttendance.map(cls => (
        (() => {
          const statusStyle = getAttendanceStatusStyle(cls.attendance, theme);
          const isAttendanceSaving = savingAttendanceKey === cls.key;
          return (
        <div key={cls.key} style={{
          background: "#f9fafb",
          padding: "12px",
          borderRadius: "8px",
          border: `1px solid ${statusStyle.border}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "#1f2937" }}>
                {cls.studentName}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
                {cls.time} · {formatCurrency(cls.pricePerClass)}
              </p>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "3px 0 0 0" }}>
                {cls.locationName || "Sem local"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                <span style={{ padding: "3px 7px", borderRadius: "4px", background: theme.light, color: theme.dark, fontSize: "11px", fontWeight: "700" }}>
                  {getScheduleItemTypeLabel(cls.scheduleType)}
                </span>
                {cls.scheduleNote && <span style={{ padding: "3px 7px", borderRadius: "4px", background: "#f3f4f6", color: "#4b5563", fontSize: "11px", fontWeight: "600" }}>{cls.scheduleNote}</span>}
              </div>
            </div>
            <span style={{
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "700",
              background: statusStyle.background,
              color: statusStyle.color
            }}>
              {statusStyle.label}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
            <button
              onClick={() => quickUpdateAttendance(cls, "present")}
              disabled={isAttendanceSaving}
              style={{ flex: 1, padding: "7px", background: cls.attendance === "present" ? "#d1fae5" : "white", border: "1px solid #a7f3d0", color: "#059669", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: isAttendanceSaving ? "not-allowed" : "pointer", opacity: isAttendanceSaving ? 0.6 : 1 }}
            >
              Presente
            </button>
            <button
              onClick={() => quickUpdateAttendance(cls, "absent")}
              disabled={isAttendanceSaving}
              style={{ flex: 1, padding: "7px", background: cls.attendance === "absent" ? "#fee2e2" : "white", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: isAttendanceSaving ? "not-allowed" : "pointer", opacity: isAttendanceSaving ? 0.6 : 1 }}
            >
              Falta
            </button>
            <button
              onClick={() => openWhatsAppMessage(cls.studentPhone, `Ola, ${cls.studentName}! Confirmando sua aula do dia ${dateLabel} as ${cls.time}. Pode confirmar?`)}
              style={{ flex: 1, padding: "7px", background: "#dcfce7", border: "none", color: "#166534", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              Confirmar
            </button>
            <button
              onClick={() => openWhatsAppMessage(cls.studentPhone, `Ola, ${cls.studentName}! Se precisar trocar o horario da aula do dia ${dateLabel}, me avise por aqui para combinarmos a remarcacao.`)}
              style={{ flex: 1, padding: "7px", background: "#eff6ff", border: "none", color: "#1d4ed8", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              WhatsApp
            </button>
            <button
              onClick={() => {
                setRescheduleKey(rescheduleKey === cls.key ? null : cls.key);
                setRescheduleForm({ date: "", time: cls.time });
              }}
              disabled={savingSchedule}
              style={{ flex: 1, padding: "7px", background: "white", border: `1px solid ${theme.medium}`, color: theme.primary, borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              Remarcar
            </button>
            <button
              onClick={() => cancelClass(cls)}
              disabled={savingSchedule}
              style={{ flex: 1, padding: "7px", background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
            >
              Cancelar do dia
            </button>
          </div>
          {rescheduleKey === cls.key && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "6px", marginTop: "8px" }}>
              <input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm(form => ({ ...form, date: e.target.value }))}
                style={{ padding: "7px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
              />
              <input
                type="time"
                value={rescheduleForm.time}
                onChange={(e) => setRescheduleForm(form => ({ ...form, time: e.target.value }))}
                style={{ padding: "7px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px" }}
              />
              <button
                onClick={() => rescheduleClass(cls)}
                disabled={savingSchedule || !rescheduleForm.date || !rescheduleForm.time}
                style={{ padding: "7px 10px", background: theme.primary, color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
              >
                OK
              </button>
            </div>
          )}
        </div>
          );
        })()
      ))}
    </div>
  );
}
