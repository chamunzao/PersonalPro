export const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export const DAY_ABBR = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const HOURS = Array.from({ length: 15 }, (_, i) => {
  const hour = 6 + i;
  return `${String(hour).padStart(2, "0")}:00`;
});

export const GYM_FEE_PER_CLASS = 21;
export const REVENUE_LIMIT = 5500;

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
