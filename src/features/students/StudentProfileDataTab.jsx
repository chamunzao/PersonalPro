import React from 'react';
import { DAYS } from '../../lib/constants';
import { formatCurrency } from '../../lib/money';
import {
  BILLING_TYPES,
  calculateBillingStatus,
  getBillingStatusColors,
  getBillingStatusLabel
} from '../billing/billingCalculations';

export function DataTabContent({ student, records, onEdit, theme }) {
  const billingStatus = calculateBillingStatus(student, records);
  const billingColors = getBillingStatusColors(billingStatus);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#243B5C", padding: "16px", borderRadius: "12px", border: "1px solid #4A6388" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#C2CAD7", margin: "0 0 12px 0" }}>Dados Pessoais</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Nome</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{student.name}</p>
          </div>
          {student.cpf && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>CPF</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{student.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
          </div>}
          {student.email && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>E-mail</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{student.email}</p>
          </div>}
          {student.phone && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>WhatsApp</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{student.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}</p>
          </div>}
          {student.birthDate && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Data de Nascimento</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{new Date(student.birthDate).toLocaleDateString("pt-BR")}</p>
          </div>}
          <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Preço/Aula</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: theme.primary }}>{formatCurrency(student.pricePerClass)}</p>
          </div>
        </div>
      </div>

      <div style={{ background: "#243B5C", padding: "16px", borderRadius: "12px", border: "1px solid #4A6388" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#C2CAD7", margin: "0 0 12px 0" }}>Cobrança</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Tipo</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{billingStatus.billingTypeLabel}</p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Status</p>
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
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Valor do plano</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: theme.primary }}>{formatCurrency(billingStatus.planValue)}</p>
          </div>}
          {billingStatus.contractedClasses > 0 && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Aulas</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>
              {billingStatus.usedClasses}/{billingStatus.contractedClasses} usadas
            </p>
          </div>}
          {billingStatus.billingType === BILLING_TYPES.monthlyPackage && billingStatus.contractedClasses === 0 && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Aulas do mês</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>Calculadas em pagamentos</p>
          </div>}
          {billingStatus.remainingClasses !== null && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Restantes</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: billingColors.color }}>{billingStatus.remainingClasses} aulas</p>
          </div>}
          {student.billingDueDate && <div>
            <p style={{ fontSize: "11px", color: "#91A0B6", margin: "0 0 4px 0" }}>Vencimento</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#FFFFFF" }}>{new Date(student.billingDueDate).toLocaleDateString("pt-BR")}</p>
          </div>}
        </div>
      </div>

      <div style={{ background: "#243B5C", padding: "16px", borderRadius: "12px", border: "1px solid #4A6388" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#C2CAD7", margin: "0 0 12px 0" }}>Horários da Semana</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {student.schedule && student.schedule.length > 0 ? (
            DAYS.map((day, idx) => {
              const times = student.schedule.filter(s => s.day === idx).map(s => s.time).sort();
              return times.length > 0 ? (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#C2CAD7", fontWeight: "600" }}>{day}:</span>
                  <span style={{ fontSize: "13px", color: "#FFFFFF" }}>{times.join(", ")}</span>
                </div>
              ) : null;
            })
          ) : <p style={{ color: "#91A0B6", fontSize: "13px", margin: "0" }}>Sem horários definidos</p>}
        </div>
      </div>

      {student.notes && <div style={{ background: "#243B5C", padding: "16px", borderRadius: "12px", border: "1px solid #4A6388" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#C2CAD7", margin: "0 0 8px 0" }}>Observações</h3>
        <p style={{ fontSize: "13px", color: "#FFFFFF", margin: "0", whiteSpace: "pre-wrap" }}>{student.notes}</p>
      </div>}

      <button
        onClick={() => onEdit(student)}
        style={{
          padding: "10px 16px",
          background: theme.primary,
          color: "#142339",
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
