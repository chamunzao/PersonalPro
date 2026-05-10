export const LOCATION_TYPES = {
  gym: "gym",
  studio: "studio",
  online: "online",
  home: "home",
  other: "other"
};

export const LOCATION_FEE_TYPES = {
  none: "none",
  perClass: "perClass",
  percentage: "percentage",
  fixedMonthly: "fixedMonthly"
};

export function getLocationTypeLabel(type) {
  if (type === LOCATION_TYPES.gym) return "Academia";
  if (type === LOCATION_TYPES.studio) return "Estudio";
  if (type === LOCATION_TYPES.online) return "Online";
  if (type === LOCATION_TYPES.home) return "Domiciliar";
  return "Outro";
}

export function getLocationFeeTypeLabel(type) {
  if (type === LOCATION_FEE_TYPES.perClass) return "Taxa por aula";
  if (type === LOCATION_FEE_TYPES.percentage) return "Percentual";
  if (type === LOCATION_FEE_TYPES.fixedMonthly) return "Mensalidade fixa";
  return "Sem repasse";
}

export function getLocationName(locationId, locations = []) {
  return locations.find(location => location.id === locationId)?.name || "Sem local";
}

export function calculateLocationVariableFee(location, classRevenue) {
  if (!location) return 0;
  const feeType = location.feeType || LOCATION_FEE_TYPES.none;
  const feeValue = Number(location.feeValue) || 0;

  if (feeType === LOCATION_FEE_TYPES.perClass) return feeValue;
  if (feeType === LOCATION_FEE_TYPES.percentage) return classRevenue * (feeValue / 100);
  return 0;
}

export function calculateLocationFixedFee(location, hasRevenue) {
  if (!location || !hasRevenue) return 0;
  if ((location.feeType || LOCATION_FEE_TYPES.none) !== LOCATION_FEE_TYPES.fixedMonthly) return 0;
  return Number(location.feeValue) || 0;
}

export function applyLocationMonthlyCap(location, totalFee) {
  const cap = Number(location?.monthlyCap) || 0;
  if (cap <= 0) return totalFee;
  return Math.min(totalFee, cap);
}
