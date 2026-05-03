export function formatCurrency(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
