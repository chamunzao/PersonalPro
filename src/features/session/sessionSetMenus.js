export function hasOpenSetActionMenu(setActionMenus = {}) {
  return Object.values(setActionMenus).some(Boolean);
}

export function isSetMenuInteractionTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(target.closest(".session-set-menu") || target.closest(".session-set-menu-button"));
}
