const CHECKOUT_FIELDS = [
  ["effort", "Esforco"],
  ["pain", "Dor/limitacao"],
  ["loadProgress", "Evolucao de carga"],
  ["nextAction", "Proxima acao"]
];

function cleanText(value) {
  return String(value || "").trim();
}

export function hasSessionCheckoutChanges(checkout = {}) {
  return CHECKOUT_FIELDS.some(([key]) => cleanText(checkout[key]));
}

export function buildSessionCheckoutSummary(checkout = {}) {
  const lines = CHECKOUT_FIELDS
    .map(([key, label]) => {
      const value = cleanText(checkout[key]);
      return value ? `- ${label}: ${value}` : "";
    })
    .filter(Boolean);

  if (lines.length === 0) return "";
  return ["Check-out da aula:", ...lines].join("\n");
}

export function normalizeSessionCheckout(checkout = {}) {
  return Object.fromEntries(
    CHECKOUT_FIELDS.map(([key]) => [key, cleanText(checkout[key])])
  );
}
