export function getNextClassAction(todayClasses) {
  if (!todayClasses.length) return null;

  const classItem = todayClasses.find(item => !item.attendance) || todayClasses[0];
  const isRegistered = !!classItem.attendance;

  return {
    classItem,
    label: isRegistered ? "Revisar aula" : "Abrir aula",
    statusLabel: isRegistered ? "Registrada" : "Pendente"
  };
}
