import { useState, useMemo, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

// ==================== CONSTANTS ====================
const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
const DAY_ABBR = ["Seg", "Ter", "Qua", "Qui", "Sex"]
const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = 6 + i
  return `${String(h).padStart(2, "0")}:00`
})

const GYM_FEE_PER_CLASS = 21 // 30% de R$70
const REVENUE_LIMIT = 5500

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

function formatCurrency(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getDayOfWeek(year, month, day) {
  return new Date(year, month, day).getDay()
}

// ==================== ICONS ====================
function IconUsers() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconCalendar() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
}
function IconClipboard() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
}
function IconChart() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
}
function IconPlus() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
}
function IconTrash() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
}
function IconEdit() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
}
function IconChevron({ direction }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === "left" ? "rotate(180deg)" : "none" }}><path d="m9 18 6-6-6-6"/></svg>
}
function IconCheck() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconX() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}

// ==================== STUDENT MANAGEMENT ====================
function StudentsTab({ students, setStudents }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: "", pricePerClass: "", schedule: [] })

  function resetForm() {
    setForm({ name: "", pricePerClass: "", schedule: [] })
    setEditId(null)
    setShowForm(false)
  }

  function startEdit(s) {
    setForm({ name: s.name, pricePerClass: String(s.pricePerClass), schedule: [...s.schedule.map(x => ({ ...x }))] })
    setEditId(s.id)
    setShowForm(true)
  }

  function toggleSchedule(dayIdx, time) {
    setForm(f => {
      const exists = f.schedule.find(s => s.day === dayIdx && s.time === time)
      if (exists) return { ...f, schedule: f.schedule.filter(s => !(s.day === dayIdx && s.time === time)) }
      return { ...f, schedule: [...f.schedule, { day: dayIdx, time }] }
    })
  }

  function saveStudent() {
    if (!form.name.trim() || !form.pricePerClass || form.schedule.length === 0) return
    const data = { name: form.name.trim(), pricePerClass: parseFloat(form.pricePerClass), schedule: form.schedule }
    if (editId) {
      setStudents(prev => prev.map(s => s.id === editId ? { ...s, ...data } : s))
    } else {
      const newId = Math.max(0, ...students.map(s => s.id)) + 1
      setStudents(prev => [...prev, { id: newId, ...data }])
    }
    resetForm()
  }

  function deleteStudent(id) {
    if (window.confirm("Tem certeza que deseja remover este aluno?")) {
      setStudents(prev => prev.filter(s => s.id !== id))
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#1e293b" }}>Alunos ({students.length})</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <IconPlus /> Novo
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#334155" }}>{editId ? "Editar Aluno" : "Novo Aluno"}</h3>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <input placeholder="Nome do aluno" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }} />
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14, fontWeight: 600 }}>R$</span>
              <input type="number" placeholder="Valor" value={form.pricePerClass} onChange={e => setForm(f => ({ ...f, pricePerClass: e.target.value }))}
                style={{ width: 110, padding: "10px 14px 10px 38px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }} />
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px", fontWeight: 600 }}>Horários das aulas:</p>
          <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)", gap: 3, fontSize: 11, minWidth: 340 }}>
              <div></div>
              {DAY_ABBR.map(d => <div key={d} style={{ textAlign: "center", fontWeight: 700, color: "#475569", padding: "5px 0" }}>{d}</div>)}
              {HOURS.map(time => (
                <div key={time} style={{ display: "contents" }}>
                  <div style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>{time}</div>
                  {DAYS.map((_, dayIdx) => {
                    const active = form.schedule.some(s => s.day === dayIdx && s.time === time)
                    return (
                      <div key={`${dayIdx}-${time}`} onClick={() => toggleSchedule(dayIdx, time)}
                        style={{ height: 26, borderRadius: 5, cursor: "pointer", background: active ? "#7c3aed" : "#f1f5f9", border: active ? "none" : "1px solid #e2e8f0", transition: "all 0.15s" }} />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={resetForm} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 14, cursor: "pointer", color: "#475569" }}>Cancelar</button>
            <button onClick={saveStudent} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: (!form.name || !form.pricePerClass || form.schedule.length === 0) ? 0.5 : 1 }}>Salvar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {students.map(s => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                {formatCurrency(s.pricePerClass)}/aula · {s.schedule.map(sc => `${DAY_ABBR[sc.day]} ${sc.time}`).join(", ")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
              <button onClick={() => startEdit(s)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><IconEdit /></button>
              <button onClick={() => deleteStudent(s.id)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}><IconTrash /></button>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>Nenhum aluno cadastrado ainda.</div>
        )}
      </div>
    </div>
  )
}

// ==================== AGENDA ====================
function AgendaTab({ students, year, month, setYear, setMonth }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }

  const totalDays = getDaysInMonth(year, month)
  const calendarWeeks = useMemo(() => {
    const weeks = []
    let week = new Array(7).fill(null)
    for (let d = 1; d <= totalDays; d++) {
      const dow = getDayOfWeek(year, month, d)
      week[dow] = d
      if (dow === 6 || d === totalDays) { weeks.push(week); week = new Array(7).fill(null) }
    }
    return weeks
  }, [year, month, totalDays])

  function getClassesForDay(day) {
    const dow = getDayOfWeek(year, month, day)
    if (dow === 0 || dow === 6) return []
    const dayIdx = dow - 1
    const classes = []
    students.forEach(s => {
      s.schedule.forEach(sch => {
        if (sch.day === dayIdx) classes.push({ student: s.name, time: sch.time, price: s.pricePerClass })
      })
    })
    return classes.sort((a, b) => a.time.localeCompare(b.time))
  }

  const selectedClasses = selectedDay ? getClassesForDay(selectedDay) : []

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="left" /></button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="right" /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 14 }}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", padding: "6px 0" }}>{d}</div>
        ))}
        {calendarWeeks.flat().map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const classes = getClassesForDay(day)
          const isToday = `${year}-${month}-${day}` === todayStr
          const isSelected = selectedDay === day
          const dow = getDayOfWeek(year, month, day)
          const isWeekend = dow === 0 || dow === 6
          return (
            <div key={`d-${day}`} onClick={() => !isWeekend && setSelectedDay(day === selectedDay ? null : day)}
              style={{
                minHeight: 44, borderRadius: 8, padding: "3px 4px", cursor: isWeekend ? "default" : "pointer",
                background: isSelected ? "#ede9fe" : isToday ? "#f0fdf4" : isWeekend ? "#f8fafc" : "#fff",
                border: isSelected ? "2px solid #7c3aed" : isToday ? "2px solid #22c55e" : "1px solid #e2e8f0",
                opacity: isWeekend ? 0.4 : 1,
              }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? "#16a34a" : "#334155" }}>{day}</div>
              {classes.length > 0 && (
                <div style={{ display: "flex", gap: 2, marginTop: 1, flexWrap: "wrap" }}>
                  {classes.length <= 3 ? classes.map((_, idx) => <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed" }} />) : <span style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700 }}>{classes.length}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#334155" }}>
            {selectedDay} de {MONTHS[month]} · {selectedClasses.length} aula{selectedClasses.length !== 1 ? "s" : ""}
          </h3>
          {selectedClasses.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Nenhuma aula neste dia.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedClasses.map((c, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#7c3aed", fontSize: 12, marginRight: 8 }}>{c.time}</span>
                    <span style={{ fontSize: 13, color: "#1e293b" }}>{c.student}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{formatCurrency(c.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== ATTENDANCE ====================
function AttendanceTab({ students, records, setRecords, year, month, setYear, setMonth }) {
  const [filter, setFilter] = useState("all")

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }

  const grouped = useMemo(() => {
    const totalDays = getDaysInMonth(year, month)
    const result = {}
    for (let d = 1; d <= totalDays; d++) {
      const dow = getDayOfWeek(year, month, d)
      if (dow === 0 || dow === 6) continue
      const dayIdx = dow - 1
      const dayLabel = `${DAY_ABBR[dayIdx]}, ${d}`
      students.forEach(s => {
        s.schedule.forEach(sch => {
          if (sch.day === dayIdx) {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}_${s.id}_${sch.time}`
            const item = { key, day: d, time: sch.time, studentName: s.name, studentId: s.id, price: s.pricePerClass, status: records[key] || "scheduled" }
            if (!result[dayLabel]) result[dayLabel] = []
            result[dayLabel].push(item)
          }
        })
      })
    }
    return result
  }, [students, records, year, month])

  function setStatus(key, status) {
    setRecords(prev => ({ ...prev, [key]: status }))
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="left" /></button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="right" /></button>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto" }}>
        {[{ key: "all", label: "Todas" }, { key: "scheduled", label: "Pendentes" }, { key: "present", label: "Presenças" }, { key: "absent", label: "Faltas" }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: "6px 12px", borderRadius: 20, border: filter === f.key ? "none" : "1px solid #e2e8f0", background: filter === f.key ? "#7c3aed" : "#fff", color: filter === f.key ? "#fff" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "55vh", overflowY: "auto" }}>
        {Object.entries(grouped).map(([label, items]) => {
          const filtered = filter === "all" ? items : items.filter(c => c.status === filter)
          if (filtered.length === 0) return null
          return (
            <div key={label}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {filtered.map(c => (
                  <div key={c.key} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 600, color: "#7c3aed", fontSize: 12, marginRight: 8 }}>{c.time}</span>
                      <span style={{ fontSize: 13, color: "#1e293b" }}>{c.studentName}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{formatCurrency(c.price)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => setStatus(c.key, c.status === "present" ? "scheduled" : "present")} title="Presente"
                        style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          background: c.status === "present" ? "#22c55e" : "#f1f5f9", color: c.status === "present" ? "#fff" : "#94a3b8" }}>
                        <IconCheck />
                      </button>
                      <button onClick={() => setStatus(c.key, c.status === "absent" ? "scheduled" : "absent")} title="Faltou"
                        style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          background: c.status === "absent" ? "#ef4444" : "#f1f5f9", color: c.status === "absent" ? "#fff" : "#94a3b8" }}>
                        <IconX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== REPORTS ====================
function ReportTab({ students, records, year, month, setYear, setMonth }) {
  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }

  const stats = useMemo(() => {
    const totalDays = getDaysInMonth(year, month)
    let totalScheduled = 0, totalPresent = 0, totalAbsent = 0, totalRevenue = 0, totalGymFee = 0
    const studentStats = {}
    students.forEach(s => { studentStats[s.id] = { name: s.name, price: s.pricePerClass, scheduled: 0, present: 0, absent: 0, revenue: 0 } })

    const classesInOrder = []

    for (let d = 1; d <= totalDays; d++) {
      const dow = getDayOfWeek(year, month, d)
      if (dow === 0 || dow === 6) continue
      const dayIdx = dow - 1
      students.forEach(s => {
        s.schedule.forEach(sch => {
          if (sch.day === dayIdx) {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}_${s.id}_${sch.time}`
            const status = records[key] || "scheduled"
            totalScheduled++
            if (studentStats[s.id]) studentStats[s.id].scheduled++

            if (status === "present") {
              totalPresent++
              totalRevenue += s.pricePerClass
              classesInOrder.push({ day: d, time: sch.time, price: s.pricePerClass })
              if (studentStats[s.id]) { studentStats[s.id].present++; studentStats[s.id].revenue += s.pricePerClass }
            } else if (status === "absent") {
              totalAbsent++
              if (studentStats[s.id]) studentStats[s.id].absent++
            }
          }
        })
      })
    }

    // Gym fee calculation
    let cumRevenue = 0
    classesInOrder.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    classesInOrder.forEach(c => {
      cumRevenue += c.price
      if (cumRevenue <= REVENUE_LIMIT) totalGymFee += GYM_FEE_PER_CLASS
    })

    return {
      totalScheduled, totalPresent, totalAbsent,
      totalPending: totalScheduled - totalPresent - totalAbsent,
      totalRevenue, totalGymFee,
      netIncome: totalRevenue - totalGymFee,
      attendanceRate: totalPresent + totalAbsent > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 0,
      studentStats: Object.values(studentStats),
    }
  }, [students, records, year, month])

  const card = { background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", flex: 1, minWidth: 120 }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="left" /></button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconChevron direction="right" /></button>
      </div>

      {/* Financial Summary */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ ...card, borderLeft: "4px solid #22c55e" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Receita Bruta</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginTop: 4 }}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div style={{ ...card, borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Taxa Academia</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626", marginTop: 4 }}>-{formatCurrency(stats.totalGymFee)}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>R$21/aula até {formatCurrency(REVENUE_LIMIT)}</div>
        </div>
        <div style={{ ...card, borderLeft: "4px solid #7c3aed" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Receita Líquida</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>{formatCurrency(stats.netIncome)}</div>
        </div>
      </div>

      {/* Attendance stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
        {[
          { label: "Aulas", value: stats.totalPresent, color: "#1e293b" },
          { label: "Faltas", value: stats.totalAbsent, color: "#ef4444" },
          { label: "Pendente", value: stats.totalPending, color: "#f59e0b" },
          { label: "Frequência", value: `${stats.attendanceRate}%`, color: "#1e293b" },
        ].map((s, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Gym fee progress */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Limite taxa academia</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{formatCurrency(stats.totalRevenue)} / {formatCurrency(REVENUE_LIMIT)}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: stats.totalRevenue >= REVENUE_LIMIT ? "#22c55e" : "#f59e0b", width: `${Math.min(100, (stats.totalRevenue / REVENUE_LIMIT) * 100)}%`, transition: "width 0.3s" }} />
        </div>
        {stats.totalRevenue >= REVENUE_LIMIT && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 4 }}>Limite atingido! Sem taxa de academia.</div>}
      </div>

      {/* Per-student */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <h3 style={{ margin: 0, fontSize: 14, color: "#334155" }}>Por Aluno</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Aluno</th>
                <th style={{ textAlign: "center", padding: "8px 6px", color: "#64748b", fontWeight: 600 }}>$/Aula</th>
                <th style={{ textAlign: "center", padding: "8px 6px", color: "#64748b", fontWeight: 600 }}>Pres.</th>
                <th style={{ textAlign: "center", padding: "8px 6px", color: "#64748b", fontWeight: 600 }}>Faltas</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.studentStats.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b", whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ padding: "8px 6px", textAlign: "center", color: "#64748b" }}>{formatCurrency(s.price)}</td>
                  <td style={{ padding: "8px 6px", textAlign: "center" }}>
                    <span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>{s.present}</span>
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "center" }}>
                    <span style={{ background: "#fef2f2", color: "#ef4444", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>{s.absent}</span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>{formatCurrency(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function App() {
  const [tab, setTab] = useState("students")
  const [students, setStudents] = useLocalStorage("rosana_students", [])
  const [records, setRecords] = useLocalStorage("rosana_records", {})
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const tabs = [
    { key: "students", label: "Alunos", icon: <IconUsers /> },
    { key: "agenda", label: "Agenda", icon: <IconCalendar /> },
    { key: "attendance", label: "Registro", icon: <IconClipboard /> },
    { key: "report", label: "Relatório", icon: <IconChart /> },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: "100vw", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", padding: "20px 20px 56px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Rosana Personal</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.85 }}>Gestão de aulas e finanças</p>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: 500, margin: "-36px auto 0", padding: "0 12px" }}>
        {/* Tab bar */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: 5, display: "flex", gap: 3, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "8px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 600,
                background: tab === t.key ? "#7c3aed" : "transparent",
                color: tab === t.key ? "#fff" : "#64748b",
                transition: "all 0.2s",
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", padding: 16, marginBottom: 24 }}>
          {tab === "students" && <StudentsTab students={students} setStudents={setStudents} />}
          {tab === "agenda" && <AgendaTab students={students} year={year} month={month} setYear={setYear} setMonth={setMonth} />}
          {tab === "attendance" && <AttendanceTab students={students} records={records} setRecords={setRecords} year={year} month={month} setYear={setYear} setMonth={setMonth} />}
          {tab === "report" && <ReportTab students={students} records={records} year={year} month={month} setYear={setYear} setMonth={setMonth} />}
        </div>
      </div>
    </div>
  )
}
