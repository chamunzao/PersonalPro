import { DAYS } from "../../lib/constants.js";
import { formatDate, jsDayToIndex } from "../../lib/dates.js";
import { formatCurrency } from "../../lib/money.js";
import { calculateAdvanceCreditStatus, calculateBillingStatus } from "../billing/billingCalculations.js";

function getFirstName(student) {
  const name = String(student?.name || "").trim();
  return name.split(" ")[0] || "aluno";
}

function getWeeklyScheduleText(student) {
  const schedule = student?.schedule || [];
  if (schedule.length === 0) return "Voce ainda nao tem horarios fixos cadastrados nesta semana.";

  return DAYS.map((day, dayIndex) => {
    const times = schedule
      .filter(item => item.day === dayIndex)
      .map(item => item.time)
      .filter(Boolean)
      .sort();
    return times.length > 0 ? `${day}: ${times.join(", ")}` : null;
  }).filter(Boolean).join("\n");
}

function getMonthPayment(student, payments, monthKey) {
  return payments.find(payment => (
    payment.paid
    && payment.month === monthKey
    && (payment.studentId === student.id || payment.key === `${monthKey}_${student.id}`)
  ));
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatClassSchedule(nextClass) {
  if (!nextClass?.dateText && !nextClass?.time) return "na proxima aula";
  if (nextClass?.dateText && nextClass?.time) return `em ${nextClass.dateText}, as ${nextClass.time}`;
  if (nextClass?.dateText) return `em ${nextClass.dateText}`;
  return `as ${nextClass.time}`;
}

function getNextClassFromSchedule(student, asOf = new Date()) {
  const schedule = student?.schedule || [];
  if (schedule.length === 0) return null;

  const start = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());

  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dayIndex = jsDayToIndex(date.getDay());
    const times = schedule
      .filter(item => item.day === dayIndex && item.time)
      .map(item => item.time)
      .sort();

    if (times.length > 0) {
      return {
        date,
        dateText: formatDate(date),
        time: times[0]
      };
    }
  }

  return null;
}

export function buildWeeklyConfirmationMessage({ student }) {
  const firstName = getFirstName(student);
  const weeklySchedule = getWeeklyScheduleText(student);
  return `Ola, ${firstName}! Passando para confirmar sua agenda da semana:\n\n${weeklySchedule}\n\nPode me confirmar se esta tudo certo?`;
}

export function buildPaymentReminderMessage({ student, records = [], payments = [], asOf = new Date() }) {
  const firstName = getFirstName(student);
  const monthKey = getMonthKey(asOf);
  const payment = getMonthPayment(student, payments, monthKey);
  const billingStatus = calculateBillingStatus(student, records, asOf);
  const expectedValue = billingStatus.planValue || student?.packagePrice || student?.pricePerClass || 0;

  if (payment) {
    return `Ola, ${firstName}! Seu pagamento deste mes consta como recebido. Obrigado!`;
  }

  return `Ola, ${firstName}! Passando para lembrar do pagamento deste mes antes da proxima aula. Valor previsto: ${formatCurrency(expectedValue)}. Qualquer duvida me chama por aqui.`;
}

export function buildPackageEndingMessage({ student, records = [], payments = [], asOf = new Date() }) {
  const firstName = getFirstName(student);
  const creditStatus = calculateAdvanceCreditStatus(student, records, payments, asOf);
  const billingStatus = calculateBillingStatus(student, records, asOf);
  const remainingClasses = creditStatus.remainingClasses ?? billingStatus.remainingClasses;

  if (remainingClasses !== null) {
    return `Ola, ${firstName}! Seu pacote esta com ${remainingClasses} aula${remainingClasses === 1 ? "" : "s"} restante${remainingClasses === 1 ? "" : "s"}. Vamos alinhar a renovacao para nao interromper sua rotina?`;
  }

  return `Ola, ${firstName}! Passando para alinharmos a continuidade do seu plano de treinos deste mes.`;
}

export function buildPostClassMessage({ student, classDateText = "", focus = "", notes = "" }) {
  const firstName = getFirstName(student);
  const datePart = classDateText ? ` de ${classDateText}` : "";
  const focusPart = focus ? ` O foco principal foi ${focus}.` : "";
  const notesPart = notes ? ` Observacao importante: ${notes}.` : "";

  return `Ola, ${firstName}! Passando para registrar o fechamento da aula${datePart}.${focusPart}${notesPart} Qualquer sinal de dor ou desconforto, me avisa por aqui.`;
}

export function buildAbsenceReplacementMessage({ student, missedDateText = "", replacementDateText = "", replacementTime = "" }) {
  const firstName = getFirstName(student);
  const missedPart = missedDateText ? ` da aula de ${missedDateText}` : "";
  const replacementPart = replacementDateText || replacementTime
    ? ` Podemos repor em ${replacementDateText || "uma nova data"}${replacementTime ? ` as ${replacementTime}` : ""}?`
    : " Vamos combinar um melhor horario para reposicao?";

  return `Ola, ${firstName}! Vi sua falta${missedPart}.${replacementPart}`;
}

export function buildNextClassConfirmationMessage({ student, nextClass = null }) {
  const firstName = getFirstName(student);
  return `Ola, ${firstName}! Confirmando sua proxima aula ${formatClassSchedule(nextClass)}. Pode me avisar se precisar ajustar algo?`;
}

export function buildInactiveStudentMessage({ student }) {
  const firstName = getFirstName(student);
  return `Ola, ${firstName}! Faz um tempo que nao registramos aula. Quer retomar sua rotina esta semana? Posso te ajudar a escolher o melhor horario.`;
}

export function buildCommunicationMessages({ student, records = [], payments = [], asOf = new Date(), nextClass = null }) {
  const resolvedNextClass = nextClass || getNextClassFromSchedule(student, asOf);

  return {
    weeklyConfirmation: buildWeeklyConfirmationMessage({ student }),
    paymentReminder: buildPaymentReminderMessage({ student, records, payments, asOf }),
    packageEnding: buildPackageEndingMessage({ student, records, payments, asOf }),
    postClass: buildPostClassMessage({ student }),
    absenceReplacement: buildAbsenceReplacementMessage({ student }),
    nextClassConfirmation: buildNextClassConfirmationMessage({ student, nextClass: resolvedNextClass }),
    inactiveStudent: buildInactiveStudentMessage({ student }),
    weeklyCheckIn: `Ola, ${getFirstName(student)}! Check-in rapido da semana: como voce esta se sentindo com os treinos, dores, energia e rotina? Me responde por aqui para eu ajustar o acompanhamento.`,
    workoutReminder: `Ola, ${getFirstName(student)}! Passando para reforcar seu treino atual. Se tiver duvida em algum exercicio, me chama por aqui antes da proxima aula.`
  };
}

export { getMonthPayment, getNextClassFromSchedule, getWeeklyScheduleText };
