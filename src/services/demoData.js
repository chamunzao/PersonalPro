export const DEMO_EMAIL = "demo.personalpro.20260504@personalpro.app";

function student(id, data) {
  return {
    id,
    name: data.name,
    pricePerClass: data.pricePerClass,
    schedule: data.schedule,
    notes: data.notes || "",
    cpf: data.cpf || "",
    email: data.email || "",
    phone: data.phone || "",
    birthDate: data.birthDate || "",
    billingType: data.billingType || "per_class",
    packageClasses: data.packageClasses ?? null,
    packagePrice: data.packagePrice ?? null,
    billingCycleStart: data.billingCycleStart ?? null,
    billingDueDate: data.billingDueDate ?? null,
    billingAutoRenew: data.billingAutoRenew ?? false
  };
}

export const demoStudents = [
  student("demo-aluno-01", { name: "Ana Beatriz", pricePerClass: 85, phone: "11991110001", email: "ana.demo@example.com", billingType: "monthly_package", packagePrice: 680, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-05", billingAutoRenew: true, notes: "Foco em hipertrofia e postura.", schedule: [{ day: 0, time: "07:00" }, { day: 2, time: "07:00" }, { day: 4, time: "07:00" }, { day: 6, time: "08:00" }] }),
  student("demo-aluno-02", { name: "Bruno Lima", pricePerClass: 90, phone: "11991110002", email: "bruno.demo@example.com", billingType: "monthly_package", packagePrice: 720, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-05", billingAutoRenew: true, notes: "Atende no mesmo horario da Ana aos domingos.", schedule: [{ day: 1, time: "19:00" }, { day: 3, time: "19:00" }, { day: 6, time: "08:00" }] }),
  student("demo-aluno-03", { name: "Carla Souza", pricePerClass: 75, phone: "11991110003", email: "carla.demo@example.com", billingType: "package", packageClasses: 12, packagePrice: 840, billingCycleStart: "2026-04-20", billingDueDate: "2026-05-20", notes: "Retorno pos-lesao de joelho.", schedule: [{ day: 0, time: "08:00" }, { day: 2, time: "08:00" }, { day: 4, time: "08:00" }] }),
  student("demo-aluno-04", { name: "Diego Martins", pricePerClass: 100, phone: "11991110004", email: "diego.demo@example.com", billingType: "monthly", packageClasses: 16, packagePrice: 1400, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-03", billingAutoRenew: true, notes: "Treino de performance.", schedule: [{ day: 0, time: "18:00" }, { day: 1, time: "18:00" }, { day: 3, time: "18:00" }, { day: 6, time: "09:00" }] }),
  student("demo-aluno-05", { name: "Eduarda Rocha", pricePerClass: 80, phone: "11991110005", email: "eduarda.demo@example.com", billingType: "per_class", notes: "Aulas avulsas conforme agenda.", schedule: [{ day: 2, time: "12:00" }, { day: 6, time: "10:00" }] }),
  student("demo-aluno-06", { name: "Felipe Costa", pricePerClass: 70, phone: "11991110006", email: "felipe.demo@example.com", billingType: "monthly_package", packagePrice: 560, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-10", billingAutoRenew: true, schedule: [{ day: 1, time: "07:00" }, { day: 3, time: "07:00" }] }),
  student("demo-aluno-07", { name: "Giovana Alves", pricePerClass: 95, phone: "11991110007", email: "giovana.demo@example.com", billingType: "package", packageClasses: 8, packagePrice: 720, billingCycleStart: "2026-04-28", billingDueDate: "2026-05-28", schedule: [{ day: 0, time: "20:00" }, { day: 2, time: "20:00" }] }),
  student("demo-aluno-08", { name: "Henrique Nunes", pricePerClass: 110, phone: "11991110008", email: "henrique.demo@example.com", billingType: "monthly_package", packagePrice: 880, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-01", billingAutoRenew: true, notes: "Pagamento atrasado proposital para alerta demo.", schedule: [{ day: 1, time: "06:00" }, { day: 4, time: "06:00" }] }),
  student("demo-aluno-09", { name: "Isabela Torres", pricePerClass: 85, phone: "11991110009", email: "isabela.demo@example.com", billingType: "monthly", packageClasses: 12, packagePrice: 960, billingCycleStart: "2026-05-01", billingDueDate: "2026-05-08", billingAutoRenew: true, schedule: [{ day: 0, time: "11:00" }, { day: 2, time: "11:00" }, { day: 4, time: "11:00" }] }),
  student("demo-aluno-10", { name: "João Pedro", pricePerClass: 65, phone: "11991110010", email: "joao.demo@example.com", billingType: "per_class", notes: "Aluno iniciante.", schedule: [{ day: 3, time: "16:00" }, { day: 6, time: "10:00" }] })
];

export const demoRecords = [
  { key: "01/05/2026_demo-aluno-01_07:00", status: "present", sessionNote: "Subiu carga no agachamento.", exerciseNotes: { 0: "Carga registrada durante a demo." } },
  { key: "01/05/2026_demo-aluno-03_08:00", status: "present", sessionNote: "Sem dor no joelho.", exerciseNotes: { 0: "Carga registrada durante a demo." } },
  { key: "02/05/2026_demo-aluno-07_20:00", status: "absent", sessionNote: "Avisou em cima da hora.", exerciseNotes: {} },
  { key: "03/05/2026_demo-aluno-01_08:00", status: "present", sessionNote: "Aula conjunta com Bruno.", exerciseNotes: { 0: "Carga registrada durante a demo." } },
  { key: "03/05/2026_demo-aluno-02_08:00", status: "present", sessionNote: "Precisa reduzir descanso.", exerciseNotes: { 0: "Carga registrada durante a demo." } },
  { key: "03/05/2026_demo-aluno-04_09:00", status: "present", sessionNote: "Bom rendimento.", exerciseNotes: { 0: "Carga registrada durante a demo." } },
  { key: "03/05/2026_demo-aluno-05_10:00", status: "absent", sessionNote: "Faltou sem aviso.", exerciseNotes: {} }
];

export const demoPayments = [
  { key: "2026-05_demo-aluno-01", paid: true, type: "monthly", month: "2026-05", studentId: "demo-aluno-01", amountPaid: 680, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Pacote mensal maio pago." },
  { key: "2026-05_demo-aluno-02", paid: true, type: "monthly", month: "2026-05", studentId: "demo-aluno-02", amountPaid: 720, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Pacote mensal maio pago." },
  { key: "2026-05_demo-aluno-04", paid: true, type: "monthly", month: "2026-05", studentId: "demo-aluno-04", amountPaid: 1400, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Mensalidade paga adiantada." },
  { key: "2026-05_demo-aluno-09", paid: true, type: "monthly", month: "2026-05", studentId: "demo-aluno-09", amountPaid: 960, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Mensalidade paga." },
  { key: "pacote-demo-carla", paid: true, type: "package", month: "2026-05", studentId: "demo-aluno-03", amountPaid: 840, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Pacote de 12 aulas.", classesPurchased: 12, validUntil: "2026-05-31" },
  { key: "pacote-demo-giovana", paid: true, type: "package", month: "2026-05", studentId: "demo-aluno-07", amountPaid: 720, date: "01/05/2026", dateISO: "2026-05-01", method: "Pix", note: "Pacote de 8 aulas.", classesPurchased: 8, validUntil: "2026-05-31" }
];

export const demoScheduleOverrides = [
  {
    key: "2026-05-03_demo-aluno-10",
    date: "2026-05-03",
    studentId: "demo-aluno-10",
    times: ["10:00"],
    items: [{ time: "10:00", type: "extra", note: "Aula extra da conta demo", pricePerClass: 65 }]
  }
];

const workoutTemplate = [
  { name: "Agachamento livre", sets: "4", reps: "10", weight: "40kg", rest: "90s", muscleGroup: "Pernas", equipment: "Barra", notes: "Priorizar amplitude segura." },
  { name: "Supino reto", sets: "3", reps: "12", weight: "30kg", rest: "75s", muscleGroup: "Peito", equipment: "Barra", notes: "Controlar descida." },
  { name: "Remada baixa", sets: "3", reps: "12", weight: "35kg", rest: "60s", muscleGroup: "Costas", equipment: "Maquina", notes: "Escapulas encaixadas." },
  { name: "Prancha", sets: "3", reps: "40s", weight: "", rest: "45s", muscleGroup: "Core", equipment: "Solo", notes: "Manter quadril alinhado." }
];

export function getDemoWorkoutPlans(studentId) {
  const student = demoStudents.find(item => item.id === studentId);
  if (!student) return [];

  return [{
    id: "treino-a",
    name: `Treino A - ${student.name.split(" ")[0]}`,
    createdAt: "01/05/2026",
    active: true,
    exercises: workoutTemplate.map(exercise => ({ ...exercise }))
  }];
}

export function getDemoAppData() {
  return {
    themeKey: "teal",
    students: demoStudents.map(item => ({ ...item, schedule: item.schedule.map(schedule => ({ ...schedule })) })),
    records: demoRecords.map(item => ({ ...item, exerciseNotes: { ...(item.exerciseNotes || {}) } })),
    payments: demoPayments.map(item => ({ ...item })),
    scheduleOverrides: demoScheduleOverrides.map(item => ({
      ...item,
      times: [...item.times],
      items: item.items.map(scheduleItem => ({ ...scheduleItem }))
    }))
  };
}
