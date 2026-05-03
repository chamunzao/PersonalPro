import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc
} from "firebase/firestore";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/seedDemoAccount.mjs <email> <password>");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: "AIzaSyBaI_A5QJPZKhki0D_-2tBBKHCvoQSeMOs",
  authDomain: "personalpro-9a3bb.firebaseapp.com",
  projectId: "personalpro-9a3bb",
  storageBucket: "personalpro-9a3bb.firebasestorage.app",
  messagingSenderId: "978383149701",
  appId: "1:978383149701:web:25d0673a4b0760b598e7ec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function classKey(dateBR, studentId, time) {
  return `${dateBR}_${studentId}_${time}`;
}

function recordDocId(key) {
  return encodeURIComponent(key);
}

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

const students = [
  student("demo-aluno-01", {
    name: "Ana Beatriz",
    pricePerClass: 85,
    phone: "11991110001",
    email: "ana.demo@example.com",
    billingType: "monthly_package",
    packagePrice: 680,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-05",
    billingAutoRenew: true,
    notes: "Foco em hipertrofia e postura.",
    schedule: [{ day: 0, time: "07:00" }, { day: 2, time: "07:00" }, { day: 4, time: "07:00" }, { day: 6, time: "08:00" }]
  }),
  student("demo-aluno-02", {
    name: "Bruno Lima",
    pricePerClass: 90,
    phone: "11991110002",
    email: "bruno.demo@example.com",
    billingType: "monthly_package",
    packagePrice: 720,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-05",
    billingAutoRenew: true,
    notes: "Atende no mesmo horario da Ana aos domingos.",
    schedule: [{ day: 1, time: "19:00" }, { day: 3, time: "19:00" }, { day: 6, time: "08:00" }]
  }),
  student("demo-aluno-03", {
    name: "Carla Souza",
    pricePerClass: 75,
    phone: "11991110003",
    email: "carla.demo@example.com",
    billingType: "package",
    packageClasses: 12,
    packagePrice: 840,
    billingCycleStart: "2026-04-20",
    billingDueDate: "2026-05-20",
    notes: "Retorno pos-lesao de joelho.",
    schedule: [{ day: 0, time: "08:00" }, { day: 2, time: "08:00" }, { day: 4, time: "08:00" }]
  }),
  student("demo-aluno-04", {
    name: "Diego Martins",
    pricePerClass: 100,
    phone: "11991110004",
    email: "diego.demo@example.com",
    billingType: "monthly",
    packageClasses: 16,
    packagePrice: 1400,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-03",
    billingAutoRenew: true,
    notes: "Treino de performance.",
    schedule: [{ day: 0, time: "18:00" }, { day: 1, time: "18:00" }, { day: 3, time: "18:00" }, { day: 6, time: "09:00" }]
  }),
  student("demo-aluno-05", {
    name: "Eduarda Rocha",
    pricePerClass: 80,
    phone: "11991110005",
    email: "eduarda.demo@example.com",
    billingType: "per_class",
    notes: "Aulas avulsas conforme agenda.",
    schedule: [{ day: 2, time: "12:00" }, { day: 6, time: "10:00" }]
  }),
  student("demo-aluno-06", {
    name: "Felipe Costa",
    pricePerClass: 70,
    phone: "11991110006",
    email: "felipe.demo@example.com",
    billingType: "monthly_package",
    packagePrice: 560,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-10",
    billingAutoRenew: true,
    schedule: [{ day: 1, time: "07:00" }, { day: 3, time: "07:00" }]
  }),
  student("demo-aluno-07", {
    name: "Giovana Alves",
    pricePerClass: 95,
    phone: "11991110007",
    email: "giovana.demo@example.com",
    billingType: "package",
    packageClasses: 8,
    packagePrice: 720,
    billingCycleStart: "2026-04-28",
    billingDueDate: "2026-05-28",
    schedule: [{ day: 0, time: "20:00" }, { day: 2, time: "20:00" }]
  }),
  student("demo-aluno-08", {
    name: "Henrique Nunes",
    pricePerClass: 110,
    phone: "11991110008",
    email: "henrique.demo@example.com",
    billingType: "monthly_package",
    packagePrice: 880,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-01",
    billingAutoRenew: true,
    notes: "Pagamento atrasado proposital para alerta demo.",
    schedule: [{ day: 1, time: "06:00" }, { day: 4, time: "06:00" }]
  }),
  student("demo-aluno-09", {
    name: "Isabela Torres",
    pricePerClass: 85,
    phone: "11991110009",
    email: "isabela.demo@example.com",
    billingType: "monthly",
    packageClasses: 12,
    packagePrice: 960,
    billingCycleStart: "2026-05-01",
    billingDueDate: "2026-05-08",
    billingAutoRenew: true,
    schedule: [{ day: 0, time: "11:00" }, { day: 2, time: "11:00" }, { day: 4, time: "11:00" }]
  }),
  student("demo-aluno-10", {
    name: "Joao Pedro",
    pricePerClass: 65,
    phone: "11991110010",
    email: "joao.demo@example.com",
    billingType: "per_class",
    notes: "Aluno iniciante.",
    schedule: [{ day: 3, time: "16:00" }, { day: 6, time: "10:00" }]
  })
];

const workoutTemplate = [
  { name: "Agachamento livre", sets: "4", reps: "10", weight: "40kg", rest: "90s", muscleGroup: "Pernas", equipment: "Barra", notes: "Priorizar amplitude segura." },
  { name: "Supino reto", sets: "3", reps: "12", weight: "30kg", rest: "75s", muscleGroup: "Peito", equipment: "Barra", notes: "Controlar descida." },
  { name: "Remada baixa", sets: "3", reps: "12", weight: "35kg", rest: "60s", muscleGroup: "Costas", equipment: "Maquina", notes: "Escapulas encaixadas." },
  { name: "Prancha", sets: "3", reps: "40s", weight: "", rest: "45s", muscleGroup: "Core", equipment: "Solo", notes: "Manter quadril alinhado." }
];

async function signInOrCreate() {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    if (error.code !== "auth/email-already-in-use") throw error;
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }
}

async function seed() {
  const user = await signInOrCreate();
  const base = `users/${user.uid}`;

  await setDoc(doc(db, `${base}/settings/theme`), { themeKey: "teal" }, { merge: true });

  await Promise.all(students.map(async ({ id, ...data }, index) => {
    await setDoc(doc(db, `${base}/students/${id}`), data);
    await setDoc(doc(db, `${base}/students/${id}/profile/anamnesis`), {
      goal: index % 2 === 0 ? "Hipertrofia com acompanhamento de carga." : "Condicionamento e consistencia semanal.",
      trainingHistory: "Dados ficticios para demonstracao.",
      injuries: index === 2 ? "Historico de dor no joelho direito." : "",
      restrictions: index === 2 ? "Evitar impacto alto." : "",
      notes: "Conta demo criada para testar o aplicativo."
    }, { merge: true });
    await setDoc(doc(db, `${base}/students/${id}/measurements/2026-05-01`), {
      date: "2026-05-01",
      weight: 62 + index * 3,
      height: 165 + index,
      bodyFat: 18 + (index % 5),
      chest: 88 + index,
      waist: 72 + index,
      hip: 96 + index,
      notes: "Medida demo inicial."
    });
    await setDoc(doc(db, `${base}/students/${id}/workoutPlans/treino-a`), {
      name: `Treino A - ${data.name.split(" ")[0]}`,
      createdAt: "01/05/2026",
      active: true,
      exercises: workoutTemplate.map(exercise => ({ ...exercise }))
    });
  }));

  const records = [
    ["01/05/2026", "demo-aluno-01", "07:00", "present", "Subiu carga no agachamento."],
    ["01/05/2026", "demo-aluno-03", "08:00", "present", "Sem dor no joelho."],
    ["02/05/2026", "demo-aluno-07", "20:00", "absent", "Avisou em cima da hora."],
    ["03/05/2026", "demo-aluno-01", "08:00", "present", "Aula conjunta com Bruno."],
    ["03/05/2026", "demo-aluno-02", "08:00", "present", "Precisa reduzir descanso."],
    ["03/05/2026", "demo-aluno-04", "09:00", "present", "Bom rendimento."],
    ["03/05/2026", "demo-aluno-05", "10:00", "absent", "Faltou sem aviso."]
  ];

  await Promise.all(records.map(async ([dateBR, studentId, time, status, sessionNote]) => {
    const key = classKey(dateBR, studentId, time);
    await setDoc(doc(db, `${base}/records/${recordDocId(key)}`), {
      key,
      status,
      sessionNote,
      exerciseNotes: status === "present" ? { 0: "Carga registrada durante a demo." } : {}
    }, { merge: true });
  }));

  const payments = [
    ["2026-05_demo-aluno-01", "demo-aluno-01", 680, "Pacote mensal maio pago."],
    ["2026-05_demo-aluno-02", "demo-aluno-02", 720, "Pacote mensal maio pago."],
    ["2026-05_demo-aluno-04", "demo-aluno-04", 1400, "Mensalidade paga adiantada."],
    ["2026-05_demo-aluno-09", "demo-aluno-09", 960, "Mensalidade paga."],
    ["pacote-demo-carla", "demo-aluno-03", 840, "Pacote de 12 aulas.", 12],
    ["pacote-demo-giovana", "demo-aluno-07", 720, "Pacote de 8 aulas.", 8]
  ];

  await Promise.all(payments.map(async ([id, studentId, amountPaid, note, classesPurchased]) => {
    await setDoc(doc(db, `${base}/payments/${id}`), {
      paid: true,
      type: classesPurchased ? "package" : "monthly",
      month: "2026-05",
      studentId,
      amountPaid,
      discount: 0,
      surcharge: 0,
      date: "01/05/2026",
      dateISO: "2026-05-01",
      method: "Pix",
      note,
      classesPurchased: classesPurchased || null,
      validUntil: classesPurchased ? "2026-05-31" : ""
    }, { merge: true });
  }));

  await setDoc(doc(db, `${base}/scheduleOverrides/2026-05-03_demo-aluno-10`), {
    times: ["10:00"],
    items: [{ time: "10:00", type: "extra", note: "Aula extra da conta demo", pricePerClass: 65 }]
  }, { merge: true });

  console.log(`Demo seeded for ${email}`);
}

seed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
