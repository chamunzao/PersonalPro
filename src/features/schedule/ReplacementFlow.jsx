import React, { useState } from "react";
import {
  buildAbsenceReplacementMessage,
  getAvailableReplacementDefaults
} from "./replacementActions";

function openWhatsAppMessage(phone, message) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    alert("Cadastre o WhatsApp do aluno para usar esta acao.");
    return;
  }
  const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

export function ReplacementFlow({
  student,
  missedClass,
  selectedDate,
  onClose,
  onSaveReason,
  onSaveReplacement,
  theme
}) {
  const defaults = getAvailableReplacementDefaults(selectedDate, missedClass?.time);
  const [reason, setReason] = useState("");
  const [dateISO, setDateISO] = useState(defaults.dateISO);
  const [time, setTime] = useState(defaults.time);
  const [note, setNote] = useState(`Reposicao da falta de ${missedClass?.date || ""}`);
  const [saving, setSaving] = useState(false);
  const message = buildAbsenceReplacementMessage({
    studentName: student?.name,
    missedDate: missedClass?.date,
    missedTime: missedClass?.time,
    replacementDate: dateISO.split("-").reverse().join("/"),
    replacementTime: time,
    reason
  });

  async function handleSaveReason() {
    setSaving(true);
    try {
      await onSaveReason(reason);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReplacement() {
    if (!dateISO || !time) return;
    setSaving(true);
    try {
      await onSaveReplacement({ dateISO, time, note, reason });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="replacement-flow">
      <div className="replacement-flow-header">
        <div>
          <p>Falta registrada</p>
          <small>{student?.name} - {missedClass?.date} as {missedClass?.time}</small>
        </div>
        <button type="button" onClick={onClose}>Agora nao</button>
      </div>

      <div className="replacement-flow-grid">
        <label>
          <span>Motivo da falta</span>
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex: imprevisto, viagem..." />
        </label>
        <label>
          <span>Data da reposicao</span>
          <input type="date" value={dateISO} onChange={(event) => setDateISO(event.target.value)} />
        </label>
        <label>
          <span>Horario</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label>
          <span>Observacao</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observacao da agenda" />
        </label>
      </div>

      <div className="replacement-flow-message">
        <p>Mensagem sugerida</p>
        <small>{message}</small>
      </div>

      <div className="replacement-flow-actions">
        <button type="button" onClick={handleSaveReason} disabled={saving}>
          Salvar motivo
        </button>
        <button type="button" onClick={handleSaveReplacement} disabled={saving} style={{ background: theme.primary, color: "#142339" }}>
          Salvar reposicao
        </button>
        <button type="button" onClick={() => openWhatsAppMessage(student?.phone, message)} disabled={!student?.phone || saving}>
          WhatsApp
        </button>
      </div>
    </div>
  );
}
