import { DAYS } from "../../lib/constants.js";
import { formatDate, jsDayToIndex } from "../../lib/dates.js";
import { formatCurrency } from "../../lib/money.js";
import { calculateAdvanceCreditStatus, calculateBillingStatus } from "../billing/billingCalculations.js";

const STANDARD_TEMPLATE_DEFINITIONS = [
  {
    id: "weeklyConfirmation",
    title: "Confirmar semana",
    description: "Envia horários fixos da semana"
  },
  {
    id: "nextClassConfirmation",
    title: "Confirmar próxima aula",
    description: "Usa o próximo horário fixo do aluno"
  },
  {
    id: "paymentReminder",
    title: "Cobrar pagamento",
    description: "Lembrete de pendência ou recebido"
  },
  {
    id: "packageEnding",
    title: "Pacote acabando",
    description: "Mensagem para renovação"
  },
  {
    id: "absenceReplacement",
    title: "Falta e reposição",
    description: "Combina nova data"
  },
  {
    id: "postClass",
    title: "Pós-aula",
    description: "Fecha a aula pelo WhatsApp"
  },
  {
    id: "weeklyCheckIn",
    title: "Check-in semanal",
    description: "Pergunta sobre dores, energia e rotina"
  },
  {
    id: "workoutReminder",
    title: "Enviar treino",
    description: "Reforça acompanhamento do treino atual"
  },
  {
    id: "inactiveStudent",
    title: "Aluno inativo",
    description: "Convida para retomar a rotina"
  }
];

function getFirstName(student) {
  const name = String(student?.name || "").trim();
  return name.split(" ")[0] || "aluno";
}

function getWeeklyScheduleText(student) {
  const schedule = student?.schedule || [];
  if (schedule.length === 0) return "Você ainda não tem horários fixos cadastrados nesta semana.";

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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatClassSchedule(nextClass) {
  if (!nextClass?.dateText && !nextClass?.time) return "na próxima aula";
  if (nextClass?.dateText && nextClass?.time) return `em ${nextClass.dateText}, às ${nextClass.time}`;
  if (nextClass?.dateText) return `em ${nextClass.dateText}`;
  return `às ${nextClass.time}`;
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
  return `Olá, ${firstName}! Passando para confirmar sua agenda da semana:\n\n${weeklySchedule}\n\nPode me confirmar se está tudo certo?`;
}

export function buildPaymentReminderMessage({ student, records = [], payments = [], asOf = new Date() }) {
  const firstName = getFirstName(student);
  const monthKey = getMonthKey(asOf);
  const payment = getMonthPayment(student, payments, monthKey);
  const billingStatus = calculateBillingStatus(student, records, asOf);
  const expectedValue = billingStatus.planValue || student?.packagePrice || student?.pricePerClass || 0;

  if (payment) {
    return `Olá, ${firstName}! Seu pagamento deste mês consta como recebido. Obrigado!`;
  }

  return `Olá, ${firstName}! Passando para lembrar do pagamento deste mês antes da próxima aula. Valor previsto: ${formatCurrency(expectedValue)}. Qualquer dúvida, me chama por aqui.`;
}

export function buildPackageEndingMessage({ student, records = [], payments = [], asOf = new Date() }) {
  const firstName = getFirstName(student);
  const creditStatus = calculateAdvanceCreditStatus(student, records, payments, asOf);
  const billingStatus = calculateBillingStatus(student, records, asOf);
  const remainingClasses = creditStatus.remainingClasses ?? billingStatus.remainingClasses;

  if (remainingClasses !== null) {
    return `Olá, ${firstName}! Seu pacote está com ${remainingClasses} aula${remainingClasses === 1 ? "" : "s"} restante${remainingClasses === 1 ? "" : "s"}. Vamos alinhar a renovação para não interromper sua rotina?`;
  }

  return `Olá, ${firstName}! Passando para alinharmos a continuidade do seu plano de treinos deste mês.`;
}

export function buildPostClassMessage({ student, classDateText = "", focus = "", notes = "" }) {
  const firstName = getFirstName(student);
  const datePart = classDateText ? ` de ${classDateText}` : "";
  const focusPart = focus ? ` O foco principal foi ${focus}.` : "";
  const notesPart = notes ? ` Observação importante: ${notes}.` : "";

  return `Olá, ${firstName}! Passando para registrar o fechamento da aula${datePart}.${focusPart}${notesPart} Qualquer sinal de dor ou desconforto, me avisa por aqui.`;
}

export function buildAbsenceReplacementMessage({ student, missedDateText = "", replacementDateText = "", replacementTime = "" }) {
  const firstName = getFirstName(student);
  const missedPart = missedDateText ? ` da aula de ${missedDateText}` : "";
  const replacementPart = replacementDateText || replacementTime
    ? ` Podemos repor em ${replacementDateText || "uma nova data"}${replacementTime ? ` às ${replacementTime}` : ""}?`
    : " Vamos combinar o melhor horário para reposição?";

  return `Olá, ${firstName}! Vi sua falta${missedPart}.${replacementPart}`;
}

export function buildNextClassConfirmationMessage({ student, nextClass = null }) {
  const firstName = getFirstName(student);
  return `Olá, ${firstName}! Confirmando sua próxima aula ${formatClassSchedule(nextClass)}. Pode me avisar se precisar ajustar algo?`;
}

export function buildInactiveStudentMessage({ student }) {
  const firstName = getFirstName(student);
  return `Olá, ${firstName}! Faz um tempo que não registramos aula. Quer retomar sua rotina esta semana? Posso te ajudar a escolher o melhor horário.`;
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
    weeklyCheckIn: `Olá, ${getFirstName(student)}! Check-in rápido da semana: como você está se sentindo com os treinos, dores, energia e rotina? Me responde por aqui para eu ajustar o acompanhamento.`,
    workoutReminder: `Olá, ${getFirstName(student)}! Passando para reforçar seu treino atual. Se tiver dúvida em algum exercício, me chama por aqui antes da próxima aula.`
  };
}

export function getStandardMessageTemplates() {
  return STANDARD_TEMPLATE_DEFINITIONS.map(template => ({
    ...template,
    type: "standard"
  }));
}

export function createCustomMessageTemplate({ title, body }) {
  return {
    id: `custom-${Date.now()}`,
    type: "custom",
    title: String(title || "").trim(),
    description: "Mensagem criada pelo personal",
    body: String(body || "").trim()
  };
}

export function updateCustomMessageTemplate(template, { title, body }) {
  return {
    ...template,
    title: String(title || "").trim(),
    body: String(body || "").trim()
  };
}

export function filterStudentsForCommunication(students, query) {
  const normalizedQuery = normalizeText(query);
  return [...students]
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .filter(student => {
      if (!normalizedQuery) return true;
      const haystack = normalizeText(`${student.name || ""} ${student.phone || ""}`);
      return haystack.includes(normalizedQuery);
    });
}

export function buildTemplateMessageForStudent({ template, student, context = {} }) {
  const firstName = getFirstName(student);
  const fullName = String(student?.name || firstName).trim() || firstName;
  const amount = Number(context.amount || student?.packagePrice || student?.pricePerClass || 0);
  const replacements = {
    nome: fullName,
    primeiro_nome: firstName,
    valor: formatCurrency(amount),
    proxima_aula: context.nextClassText || "a combinar",
    saldo_pacote: context.remainingClasses ?? "a confirmar"
  };

  return String(template?.body || "").replace(/\{(nome|primeiro_nome|valor|proxima_aula|saldo_pacote)\}/g, (_, key) => replacements[key]);
}

export { getMonthPayment, getNextClassFromSchedule, getWeeklyScheduleText };
